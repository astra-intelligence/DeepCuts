// Tags saved in this browser (ADR-0013), for a saved profile or a signed-in account.
//
// The device profile uses the key `tags`; each signed-in account gets its own key
// (`account-<id>-tags`), so signing out and in again never mixes lists (ADR-0025).
import { z } from 'zod'
import { createTagRepository } from '../createTagRepository'
import { tagRecordSchema, type TagRepository } from '../TagRepository'
import { versionedStore } from './versionedStore'

/**
 * A TagRepository backed by localStorage.
 * @param storage - Defaults to the browser's localStorage; tests pass their own.
 * @param now - The clock for timestamps; tests pass a fake one.
 * @param key - Which list of tags to use (`'tags'` for the device profile).
 */
export function createLocalTagRepository(
  storage?: Storage,
  now?: () => string,
  key = 'tags',
): TagRepository {
  const store = versionedStore({
    key,
    schema: z.array(tagRecordSchema),
    fallback: [],
    // Only pass `storage` when given, so versionedStore's own default (localStorage) applies.
    ...(storage && { storage }),
  })
  return createTagRepository(store, now)
}
