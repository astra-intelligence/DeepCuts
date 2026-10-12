// Tests for tags saved in this browser: the shared TagRepository contract, plus storage under a
// versioned key that survives a new instance (like a page reload).
import { beforeEach, describe, expect, it } from 'vitest'
import { tagRepositoryContract } from '../tagRepository.contract'
import { createLocalTagRepository } from './LocalTagRepository'

beforeEach(() => localStorage.clear())

// The demo account's key; any account key behaves the same.
const KEY = 'account-demo-tags'
const open = (now?: () => string) => createLocalTagRepository(undefined, now, KEY)

tagRepositoryContract('LocalTagRepository', (now) => open(now))

describe('LocalTagRepository storage', () => {
  it('persists under a versioned key and survives a new instance', async () => {
    await open().setTag(7, 'liked', true)
    expect(localStorage.getItem(`deepcuts:v1:${KEY}`)).toContain('"tmdbId":7')
    expect([...(await open().getTags(7))]).toEqual(['liked'])
  })

  it.each(['not json', '{"tags":1}', '[{"tmdbId":-1,"tag":"seen","createdAt":"x"}]'])(
    'resets corrupt data (%s) to empty',
    async (raw) => {
      localStorage.setItem(`deepcuts:v1:${KEY}`, raw)
      expect(await open().list('seen')).toEqual([])
      expect(localStorage.getItem(`deepcuts:v1:${KEY}`)).toBeNull()
    },
  )
})
