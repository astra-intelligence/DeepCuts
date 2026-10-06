// Shared contract suite (ADR-0013): every TagRepository implementation must pass it unchanged.
import { beforeEach, describe, expect, it } from 'vitest'
import type { TagRepository } from './TagRepository'

/** `make` receives a deterministic clock so ordering is testable. */
export function tagRepositoryContract(name: string, make: (now: () => string) => TagRepository) {
  describe(`TagRepository contract: ${name}`, () => {
    let repo: TagRepository
    beforeEach(() => {
      let tick = 0
      repo = make(() => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)).toISOString())
    })
    const tags = async (id: number) => [...(await repo.getTags(id))].sort()

    it('starts empty', async () => {
      expect(await tags(1)).toEqual([])
      expect(await repo.list('seen')).toEqual([])
      expect(await repo.exportAll()).toEqual([])
    })

    it('applies tagRules on every write', async () => {
      await repo.setTag(1, 'watchlist', true)
      expect([...(await repo.setTag(1, 'seen', true))]).toEqual(['seen'])
      await repo.setTag(1, 'liked', true)
      await repo.setTag(1, 'disliked', true)
      expect(await tags(1)).toEqual(['disliked', 'seen'])
      await repo.setTag(1, 'watchlist', true)
      expect(await tags(1)).toEqual(['watchlist'])
    })

    it('removes a single tag', async () => {
      await repo.setTag(1, 'liked', true)
      await repo.setTag(1, 'seen', true)
      await repo.setTag(1, 'liked', false)
      expect(await tags(1)).toEqual(['seen'])
    })

    it('lists newest first and keeps the original time when re-adding', async () => {
      await repo.setTag(1, 'seen', true)
      await repo.setTag(2, 'seen', true)
      await repo.setTag(3, 'seen', true)
      await repo.setTag(1, 'seen', true)
      expect(await repo.list('seen')).toEqual([3, 2, 1])
    })

    it('ADR-0017: a disliked film is excluded from feeds and every list but Disliked', async () => {
      await repo.setTag(1, 'seen', true)
      await repo.setTag(1, 'disliked', true)
      await repo.setTag(2, 'seen', true)
      expect([...(await repo.feedExclusions())]).toEqual([1])
      expect(await repo.list('seen')).toEqual([2])
      expect(await repo.list('disliked')).toEqual([1])
      const excluded = await repo.feedExclusions()
      const discover = [1, 2, 3].filter((id) => !excluded.has(id))
      expect(discover).toEqual([2, 3])
    })

    it('round-trips through exportAll/importAll with the rules intact', async () => {
      await repo.setTag(1, 'liked', true)
      await repo.setTag(2, 'watchlist', true)
      const exported = await repo.exportAll()
      await repo.clear()
      expect(await repo.exportAll()).toEqual([])
      await repo.setTag(2, 'seen', true)
      await repo.importAll(exported)
      expect(await tags(1)).toEqual(['liked'])
      // Imported picks are applied on top of existing tags, so they win (guest picks are the latest intent).
      expect(await tags(2)).toEqual(['watchlist'])
    })
  })
}
