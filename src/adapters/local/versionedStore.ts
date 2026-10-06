// Versioned, Zod-validated localStorage access (ADR-0013). Corrupt or unknown data resets to the fallback.
import type { z } from 'zod'

export const STORAGE_PREFIX = 'deepcuts:v1:'

interface Options<T> {
  key: string
  schema: z.ZodType<T>
  fallback: T
  /** Upgrades older payloads to the current shape. Empty until a v2 exists. */
  migrate?: (raw: unknown) => unknown
  storage?: Storage
}

export function versionedStore<T>({
  key,
  schema,
  fallback,
  migrate,
  storage = localStorage,
}: Options<T>) {
  const fullKey = STORAGE_PREFIX + key
  return {
    load(): T {
      const raw = storage.getItem(fullKey)
      if (raw === null) return fallback
      try {
        const parsed: unknown = JSON.parse(raw)
        const result = schema.safeParse(migrate ? migrate(parsed) : parsed)
        if (result.success) return result.data
      } catch {
        // Fall through to the reset below.
      }
      storage.removeItem(fullKey)
      return fallback
    },
    save(value: T) {
      storage.setItem(fullKey, JSON.stringify(value))
    },
    remove() {
      storage.removeItem(fullKey)
    },
  }
}
