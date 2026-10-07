// The shared implementation of TagRepository, over a simple synchronous record store.
//
// Both local adapters (in-memory for guests, localStorage for profiles and accounts) use this
// same logic; they only decide where the list of records lives. That keeps the tag behavior
// identical everywhere, and the shared contract tests (tagRepository.contract.ts) prove it.
import { applyTag, isInFeeds, isOnList, type SystemTag, type TagSet } from '../domain/tagRules'
import type { TagRecord, TagRepository } from './TagRepository'

/** Where records live: load them all, or replace them all. Adapters provide this. */
export interface RecordStore {
  load(): TagRecord[]
  save(records: TagRecord[]): void
}

/**
 * Builds a TagRepository on top of a record store.
 * @param now - The clock for new records' timestamps; tests pass a fake one.
 */
export function createTagRepository(
  store: RecordStore,
  now: () => string = () => new Date().toISOString(),
): TagRepository {
  // The tags one film has, collected from its records.
  const tagsOf = (records: readonly TagRecord[], tmdbId: number): TagSet =>
    new Set(records.filter((r) => r.tmdbId === tmdbId).map((r) => r.tag))

  // Groups every record by film: film id → its set of tags.
  const byMovie = (records: readonly TagRecord[]) => {
    const movies = new Map<number, Set<SystemTag>>()
    for (const r of records) movies.set(r.tmdbId, (movies.get(r.tmdbId) ?? new Set()).add(r.tag))
    return movies
  }

  // Applies one tag change for one film and saves the result. Returns the film's new tags.
  function write(tmdbId: number, tag: SystemTag, on: boolean, createdAt: string): TagSet {
    const records = store.load()
    // The tag rules decide the film's full new set of tags (e.g. Dislike removes Like).
    const next = applyTag(tagsOf(records, tmdbId), tag, on)
    // Untouched tags keep their original timestamp, so list order reflects when each was added.
    const kept = records.filter((r) => r.tmdbId !== tmdbId || next.has(r.tag))
    // Only tags the film didn't already have get a new record.
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
      // Every film whose tags keep it out of feeds (today: disliked films).
      const excluded = new Set<number>()
      for (const [id, tags] of byMovie(store.load())) if (!isInFeeds(tags)) excluded.add(id)
      return excluded
    },
    async exportAll() {
      return store.load()
    },
    async importAll(records) {
      // Oldest first, through the same rules as a person tagging by hand, so the result is
      // what they would have got by tagging in this store all along.
      const ordered = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      for (const r of ordered) write(r.tmdbId, r.tag, true, r.createdAt)
    },
    async clear() {
      store.save([])
    },
  }
}
