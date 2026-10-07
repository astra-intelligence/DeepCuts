// Guest-mode tags (ADR-0011, ADR-0016): held in memory only.
//
// Nothing is written anywhere, so the promise "your picks aren't saved until you choose to
// save them" is true by construction: a reload or closed tab clears them.
import { createTagRepository } from '../createTagRepository'
import type { TagRecord, TagRepository } from '../TagRepository'

/**
 * A TagRepository whose records live in a variable for the life of this page.
 * @param now - The clock for timestamps; tests pass a fake one.
 */
export function createInMemoryTagRepository(now?: () => string): TagRepository {
  let records: TagRecord[] = []
  return createTagRepository(
    {
      load: () => records,
      save: (next) => {
        records = next
      },
    },
    now,
  )
}
