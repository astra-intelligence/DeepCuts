// Tags saved in this browser (ADR-0013), for the demo and practice accounts.
//
// Each account gets its own key (`account-<id>-tags`), so signing out and in again never mixes
// lists (ADR-0025). Passkey accounts keep their lists on the server instead (ADR-0031).
import { z } from 'zod'
import { createTagRepository } from '../createTagRepository'
import { tagRecordSchema, type TagRepository } from '../TagRepository'
import { versionedStore } from './versionedStore'

/**
 * A TagRepository backed by localStorage.
 * @param storage - Defaults to the browser's localStorage; tests pass their own.
 * @param now - The clock for timestamps; tests pass a fake one.
 * @param key - Which account's list of tags to use, e.g. `'account-demo-tags'`.
 */
export function createLocalTagRepository(
  storage: Storage | undefined,
  now: (() => string) | undefined,
  key: string,
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
