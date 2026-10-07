// Tags persisted on this device (ADR-0013): the device profile uses `tags`; each signed-in
// account gets its own key, so signing out and in again never mixes lists (ADR-0025).
import { z } from 'zod'
import { createTagRepository } from '../createTagRepository'
import { tagRecordSchema, type TagRepository } from '../TagRepository'
import { versionedStore } from './versionedStore'

export function createLocalTagRepository(
  storage?: Storage,
  now?: () => string,
  key = 'tags',
): TagRepository {
  const store = versionedStore({
    key,
    schema: z.array(tagRecordSchema),
    fallback: [],
    ...(storage && { storage }),
  })
  return createTagRepository(store, now)
}
