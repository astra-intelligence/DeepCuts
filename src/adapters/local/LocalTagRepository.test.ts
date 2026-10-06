import { beforeEach, describe, expect, it } from 'vitest'
import { tagRepositoryContract } from '../tagRepository.contract'
import { createLocalTagRepository } from './LocalTagRepository'

beforeEach(() => localStorage.clear())

tagRepositoryContract('LocalTagRepository', (now) => createLocalTagRepository(undefined, now))

describe('LocalTagRepository storage', () => {
  it('persists under a versioned key and survives a new instance', async () => {
    await createLocalTagRepository().setTag(7, 'liked', true)
    expect(localStorage.getItem('deepcuts:v1:tags')).toContain('"tmdbId":7')
    expect([...(await createLocalTagRepository().getTags(7))]).toEqual(['liked'])
  })

  it.each(['not json', '{"tags":1}', '[{"tmdbId":-1,"tag":"seen","createdAt":"x"}]'])(
    'resets corrupt data (%s) to empty',
    async (raw) => {
      localStorage.setItem('deepcuts:v1:tags', raw)
      expect(await createLocalTagRepository().list('seen')).toEqual([])
      expect(localStorage.getItem('deepcuts:v1:tags')).toBeNull()
    },
  )
})
