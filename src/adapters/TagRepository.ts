// The tag storage contract (ADR-0013): what the app can ask of wherever tags are kept.
//
// The app only ever talks to this interface, never to localStorage or a database directly.
// Today's adapters keep tags in memory (guests) or in this browser (saved profiles and the demo
// account); a Supabase adapter can replace them later without touching any screen. Methods are
// async for that reason, even though the local adapters answer instantly.
import { z } from 'zod'
import { SYSTEM_TAGS, type SystemTag, type TagSet } from '../domain/tagRules'

/**
 * One stored fact: "film `tmdbId` has tag `tag`, since `createdAt`". A film with two tags has
 * two records. Validated with Zod whenever records are read back, because storage is untrusted.
 */
export const tagRecordSchema = z.object({
  tmdbId: z.number().int().positive(),
  tag: z.enum(SYSTEM_TAGS),
  createdAt: z.iso.datetime(),
})
/** A single stored tag (see `tagRecordSchema`). */
export type TagRecord = z.infer<typeof tagRecordSchema>

/** Everything the app can do with tags, independent of where they're stored. */
export interface TagRepository {
  /** The tags on one film (empty when it has none). */
  getTags(tmdbId: number): Promise<TagSet>
  /** Turns one tag on or off. Always applies `tagRules`; returns the movie's new tags. */
  setTag(tmdbId: number, tag: SystemTag, on: boolean): Promise<TagSet>
  /** Movie ids on a list, newest first. A disliked film is only on the Disliked list. */
  list(tag: SystemTag): Promise<number[]>
  /** Movie ids that must never appear in Discover, recommendations or onboarding picks. */
  feedExclusions(): Promise<ReadonlySet<number>>
  /** Every record, for moving picks to another store (e.g. when signing in). */
  exportAll(): Promise<TagRecord[]>
  /** Replays records oldest first through `setTag`, so the rules still hold after a merge. */
  importAll(records: readonly TagRecord[]): Promise<void>
  /** Removes every tag. */
  clear(): Promise<void>
}
