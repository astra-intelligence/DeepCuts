// Guest-mode tags (ADR-0011, ADR-0016): held in memory only, so "not saved" is structurally true.
import { createTagRepository } from '../createTagRepository'
import type { TagRecord, TagRepository } from '../TagRepository'

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
