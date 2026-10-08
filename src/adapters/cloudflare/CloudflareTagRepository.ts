// The tag store for passkey accounts (ADR-0031, Stage 6 A4): the account's lists on the server,
// through `/api/tags`. It implements the same TagRepository contract as the local stores, so no
// screen changes; tagRepository.contract.ts proves the behaviors match.
//
// The server applies the tag rules itself (the same `applyTag`), so this adapter only sends what
// the person did. To keep within the API rate limit (120 requests a minute), the account's records
// are fetched once and reused for 30 seconds, and refreshed after every change.
import { z } from 'zod'
import {
  isInFeeds,
  isOnList,
  SYSTEM_TAGS,
  type SystemTag,
  type TagSet,
} from '../../domain/tagRules'
import { tagRecordSchema, type TagRecord, type TagRepository } from '../TagRepository'

/** A failed tags API call. */
export class TagApiError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Tags API failed (${status})`)
    this.status = status
  }
}

const recordsSchema = z.object({ records: z.array(tagRecordSchema) })
const tagsSchema = z.object({ tags: z.array(z.enum(SYSTEM_TAGS)) })
/** How long fetched records are reused before asking again. */
const FRESH_MS = 30_000
/** The server accepts at most this many records per import. */
const IMPORT_BATCH = 5000

/** Calls the tags API and validates the answer; any error status or odd body throws. */
async function call<T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  })
  if (!res.ok) throw new TagApiError(res.status)
  const parsed = schema.safeParse(await res.json().catch(() => undefined))
  if (!parsed.success) throw new TagApiError(502)
  return parsed.data
}

/**
 * Builds the account's tag store.
 * @param clock - For the 30-second reuse window; tests pass their own.
 */
export function createCloudflareTagRepository(clock: () => number = Date.now): TagRepository {
  let cached: { at: number; records: Promise<TagRecord[]> } | null = null

  // The account's records, oldest first (as the server sends them). Reused while fresh.
  function load(): Promise<TagRecord[]> {
    if (!cached || clock() - cached.at > FRESH_MS) {
      const records = call('GET', '/api/tags', recordsSchema).then((r) => r.records)
      cached = { at: clock(), records }
      // A failed fetch isn't kept, so the next call tries again.
      records.catch(() => (cached = null))
    }
    return cached.records
  }
  const invalidate = () => void (cached = null)

  // Groups records by film: film id → its set of tags.
  const byFilm = (records: readonly TagRecord[]) => {
    const films = new Map<number, Set<SystemTag>>()
    for (const r of records) films.set(r.tmdbId, (films.get(r.tmdbId) ?? new Set()).add(r.tag))
    return films
  }

  return {
    async getTags(tmdbId) {
      return new Set((await load()).filter((r) => r.tmdbId === tmdbId).map((r) => r.tag))
    },
    async setTag(tmdbId, tag, on): Promise<TagSet> {
      invalidate()
      const { tags } = await call(on ? 'PUT' : 'DELETE', '/api/tags', tagsSchema, { tmdbId, tag })
      return new Set(tags)
    },
    async list(tag) {
      const records = await load()
      const films = byFilm(records)
      // Newest first; for equal times, the one stored later wins (same rule as the local stores).
      return records
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.tag === tag && isOnList(films.get(r.tmdbId) ?? new Set(), tag))
        .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt) || b.i - a.i)
        .map(({ r }) => r.tmdbId)
    },
    async feedExclusions() {
      const excluded = new Set<number>()
      for (const [id, tags] of byFilm(await load())) if (!isInFeeds(tags)) excluded.add(id)
      return excluded
    },
    async exportAll() {
      return load()
    },
    async importAll(records) {
      invalidate()
      for (let i = 0; i < records.length; i += IMPORT_BATCH)
        await call('POST', '/api/tags/import', z.unknown(), {
          records: records.slice(i, i + IMPORT_BATCH),
        })
    },
    async clear() {
      invalidate()
      await call('DELETE', '/api/tags', tagsSchema, { all: true })
    },
  }
}
