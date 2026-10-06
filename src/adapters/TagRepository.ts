// Storage-agnostic tag access (ADR-0013). Async so the post-MVP Supabase adapter fits the same shape.
import { z } from 'zod'
import { SYSTEM_TAGS, type SystemTag, type TagSet } from '../domain/tagRules'

export const tagRecordSchema = z.object({
  tmdbId: z.number().int().positive(),
  tag: z.enum(SYSTEM_TAGS),
  createdAt: z.iso.datetime(),
})
export type TagRecord = z.infer<typeof tagRecordSchema>

export interface TagRepository {
  getTags(tmdbId: number): Promise<TagSet>
  /** Always applies `tagRules`; returns the movie's new tags. */
  setTag(tmdbId: number, tag: SystemTag, on: boolean): Promise<TagSet>
  /** Movie ids on a list, newest first. A disliked film is only on the Disliked list. */
  list(tag: SystemTag): Promise<number[]>
  /** Movie ids that must never appear in Discover, recommendations or onboarding picks. */
  feedExclusions(): Promise<ReadonlySet<number>>
  exportAll(): Promise<TagRecord[]>
  /** Replays records oldest first through `setTag`, so the rules still hold after a merge. */
  importAll(records: readonly TagRecord[]): Promise<void>
  clear(): Promise<void>
}
