// The tags API for signed-in accounts (ADR-0031, Stage 6 A3).
//
// - Every query is scoped to the session's user (`WHERE user_id = ?`); a user id is never taken
//   from the client, so nobody can read or change someone else's lists.
// - The tag rules (src/domain/tagRules.ts) run here too, through the same `applyTag` the app uses,
//   so a modified client can't store a state the rules forbid (e.g. Like and Dislike together).
// - Changes are written as a diff (rows to delete, rows to add). The rows travel as one JSON
//   parameter that SQLite expands with `json_each`, because D1 allows only 100 bound parameters
//   per query and 50 queries per request: a 5,000-record import is still two statements.
import { z } from 'zod'
import { tagRecordSchema, type TagRecord } from '../../src/adapters/TagRepository.ts'
import { applyTag, SYSTEM_TAGS, type SystemTag } from '../../src/domain/tagRules.ts'
import { fail, json, readJson } from '../http.ts'
import type { AccountsEnv, D1Like, D1Stmt } from './d1.ts'
import { currentUser } from './sessions.ts'

/** The most records one import may carry (the whole of a device's lists). */
export const IMPORT_LIMIT = 5000
/** The most tag rows one account may hold, so storage can't be filled by a script. */
export const ACCOUNT_TAG_LIMIT = 20_000

const NO_STORE = { 'Cache-Control': 'no-store' }

type Row = { tmdbId: number; tag: SystemTag; createdAt: string }

/** All of a user's tag rows, oldest first (insertion order breaks ties). */
async function loadAll(db: D1Like, userId: string): Promise<Row[]> {
  const { results } = await db
    .prepare(
      `SELECT tmdb_id AS tmdbId, tag, created_at AS createdAt FROM tags
       WHERE user_id = ? ORDER BY created_at, rowid`,
    )
    .bind(userId)
    .all<Row>()
  return results
}

/** One statement that deletes the given (film, tag) pairs for this user. */
const deleteRows = (db: D1Like, userId: string, rows: { tmdbId: number; tag: string }[]) =>
  db
    .prepare(
      `DELETE FROM tags WHERE user_id = ? AND EXISTS (
         SELECT 1 FROM json_each(?) j
         WHERE json_extract(j.value, '$.tmdbId') = tags.tmdb_id
           AND json_extract(j.value, '$.tag') = tags.tag)`,
    )
    .bind(userId, JSON.stringify(rows))

/** One statement that adds the given rows for this user (existing ones are left alone). */
const insertRows = (db: D1Like, userId: string, rows: Row[]) =>
  db
    .prepare(
      `INSERT OR IGNORE INTO tags (user_id, tmdb_id, tag, created_at)
       SELECT ?, json_extract(value, '$.tmdbId'), json_extract(value, '$.tag'),
              json_extract(value, '$.createdAt')
       FROM json_each(?)`,
    )
    .bind(userId, JSON.stringify(rows))

/**
 * The statements that turn `before` into `after` (both: film → set of tags). New rows get
 * `createdAt` from `stamp`; tags a film keeps are untouched, so lists stay in the order the tags
 * were first added.
 */
function diff(
  db: D1Like,
  userId: string,
  before: Map<number, Set<SystemTag>>,
  after: Map<number, Set<SystemTag>>,
  stamp: (tmdbId: number, tag: SystemTag) => string,
): D1Stmt[] {
  const removed: { tmdbId: number; tag: SystemTag }[] = []
  const added: Row[] = []
  for (const [tmdbId, tags] of before)
    for (const tag of tags) if (!after.get(tmdbId)?.has(tag)) removed.push({ tmdbId, tag })
  for (const [tmdbId, tags] of after)
    for (const tag of tags)
      if (!before.get(tmdbId)?.has(tag)) added.push({ tmdbId, tag, createdAt: stamp(tmdbId, tag) })
  return [
    ...(removed.length ? [deleteRows(db, userId, removed)] : []),
    ...(added.length ? [insertRows(db, userId, added)] : []),
  ]
}

/** Groups rows by film: film id → its set of tags. */
function byFilm(rows: readonly Row[]) {
  const films = new Map<number, Set<SystemTag>>()
  for (const r of rows) films.set(r.tmdbId, (films.get(r.tmdbId) ?? new Set()).add(r.tag))
  return films
}

/** `GET /api/tags`: every one of the user's tag records, oldest first. */
export async function listTags(request: Request, env: AccountsEnv, now = Date.now()) {
  const user = await currentUser(env.DB, request, now)
  if (!user) return fail(401, 'signed_out')
  return json(200, { records: await loadAll(env.DB, user.id) }, NO_STORE)
}

const oneTag = z.object({ tmdbId: tagRecordSchema.shape.tmdbId, tag: z.enum(SYSTEM_TAGS) })

/**
 * `PUT /api/tags` `{ tmdbId, tag }` turns a tag on; `DELETE /api/tags` `{ tmdbId, tag }` turns it
 * off, and `DELETE /api/tags` `{ all: true }` removes every tag. Returns the film's new tags.
 */
export async function changeTag(request: Request, env: AccountsEnv, now = Date.now()) {
  const user = await currentUser(env.DB, request, now)
  if (!user) return fail(401, 'signed_out')
  const on = request.method === 'PUT'
  const schema = on ? oneTag : z.union([oneTag, z.object({ all: z.literal(true) })])
  const body = await readJson(request, schema)
  if ('error' in body) return body.error

  if ('all' in body.data) {
    await env.DB.prepare('DELETE FROM tags WHERE user_id = ?').bind(user.id).run()
    return json(200, { tags: [] }, NO_STORE)
  }
  const { tmdbId, tag } = body.data
  if (on) {
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM tags WHERE user_id = ?')
      .bind(user.id)
      .first<{ n: number }>()
    if ((count?.n ?? 0) >= ACCOUNT_TAG_LIMIT) return fail(409, 'too_many_tags')
  }
  const { results } = await env.DB.prepare('SELECT tag FROM tags WHERE user_id = ? AND tmdb_id = ?')
    .bind(user.id, tmdbId)
    .all<{ tag: SystemTag }>()
  const current = new Set(results.map((r) => r.tag))
  const next = applyTag(current, tag, on)
  const createdAt = new Date(now).toISOString()
  const statements = diff(
    env.DB,
    user.id,
    new Map([[tmdbId, current]]),
    new Map([[tmdbId, new Set(next)]]),
    () => createdAt,
  )
  if (statements.length) await env.DB.batch(statements)
  return json(200, { tags: [...next] }, NO_STORE)
}

const importSchema = z.object({ records: z.array(tagRecordSchema).max(IMPORT_LIMIT) })

/**
 * `POST /api/tags/import` `{ records }`: moves a device's picks into the account when someone signs
 * in. Records are replayed oldest first through the tag rules, as if tagged by hand here, and keep
 * their original timestamps. Up to 5,000 records.
 */
export async function importTags(request: Request, env: AccountsEnv, now = Date.now()) {
  const user = await currentUser(env.DB, request, now)
  if (!user) return fail(401, 'signed_out')
  // ~70 bytes per record, so 5,000 records fit well inside 512 kB.
  const body = await readJson(request, importSchema, 512 * 1024)
  if ('error' in body) return body.error

  const existing = await loadAll(env.DB, user.id)
  const before = byFilm(existing)
  const after = new Map([...before].map(([id, tags]) => [id, new Set(tags)]))
  // When each (film, tag) was first tagged, from the imported records.
  const stamps = new Map<string, string>()
  const ordered = [...body.data.records].sort((a: TagRecord, b: TagRecord) =>
    a.createdAt.localeCompare(b.createdAt),
  )
  for (const r of ordered) {
    after.set(r.tmdbId, new Set(applyTag(after.get(r.tmdbId) ?? new Set(), r.tag, true)))
    stamps.set(`${r.tmdbId}:${r.tag}`, r.createdAt)
  }
  const total = [...after.values()].reduce((n, tags) => n + tags.size, 0)
  if (total > ACCOUNT_TAG_LIMIT) return fail(409, 'too_many_tags')

  const statements = diff(
    env.DB,
    user.id,
    before,
    after,
    (id, tag) => stamps.get(`${id}:${tag}`) ?? new Date(now).toISOString(),
  )
  if (statements.length) await env.DB.batch(statements)
  return json(200, { ok: true }, NO_STORE)
}
