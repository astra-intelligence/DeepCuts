// Profile-mode tags persisted on this device (ADR-0013).
import { z } from 'zod'
import { createTagRepository } from '../createTagRepository'
import { tagRecordSchema, type TagRepository } from '../TagRepository'
import { versionedStore } from './versionedStore'

export function createLocalTagRepository(storage?: Storage, now?: () => string): TagRepository {
  const store = versionedStore({
    key: 'tags',
    schema: z.array(tagRecordSchema),
    fallback: [],
    ...(storage && { storage }),
  })
  return createTagRepository(store, now)
}
