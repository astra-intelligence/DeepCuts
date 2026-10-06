// Shared repository logic over a synchronous record store. Adapters only decide where records live.
import { applyTag, isInFeeds, isOnList, type SystemTag, type TagSet } from '../domain/tagRules'
import type { TagRecord, TagRepository } from './TagRepository'

export interface RecordStore {
  load(): TagRecord[]
  save(records: TagRecord[]): void
}

export function createTagRepository(
  store: RecordStore,
  now: () => string = () => new Date().toISOString(),
): TagRepository {
  const tagsOf = (records: readonly TagRecord[], tmdbId: number): TagSet =>
    new Set(records.filter((r) => r.tmdbId === tmdbId).map((r) => r.tag))

  const byMovie = (records: readonly TagRecord[]) => {
    const movies = new Map<number, Set<SystemTag>>()
    for (const r of records) movies.set(r.tmdbId, (movies.get(r.tmdbId) ?? new Set()).add(r.tag))
    return movies
  }

  function write(tmdbId: number, tag: SystemTag, on: boolean, createdAt: string): TagSet {
    const records = store.load()
    const next = applyTag(tagsOf(records, tmdbId), tag, on)
    // Untouched tags keep their original timestamp, so list order reflects when each was added.
    const kept = records.filter((r) => r.tmdbId !== tmdbId || next.has(r.tag))
    const added = [...next]
      .filter((t) => !kept.some((r) => r.tmdbId === tmdbId && r.tag === t))
      .map((t) => ({ tmdbId, tag: t, createdAt }))
    store.save([...kept, ...added])
    return next
  }

  return {
    async getTags(tmdbId) {
      return tagsOf(store.load(), tmdbId)
    },
    async setTag(tmdbId, tag, on) {
      return write(tmdbId, tag, on, now())
    },
    async list(tag) {
      const records = store.load()
      const movies = byMovie(records)
      // Newest first; later writes win ties because they were appended later.
      return records
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.tag === tag && isOnList(movies.get(r.tmdbId) ?? new Set(), tag))
        .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt) || b.i - a.i)
        .map(({ r }) => r.tmdbId)
    },
    async feedExclusions() {
      const excluded = new Set<number>()
      for (const [id, tags] of byMovie(store.load())) if (!isInFeeds(tags)) excluded.add(id)
      return excluded
    },
    async exportAll() {
      return store.load()
    },
    async importAll(records) {
      const ordered = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      for (const r of ordered) write(r.tmdbId, r.tag, true, r.createdAt)
    },
    async clear() {
      store.save([])
    },
  }
}
