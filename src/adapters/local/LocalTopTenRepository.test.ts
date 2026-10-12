// Tests for a Top Ten saved in this browser: the shared TopTenRepository contract, plus storage
// under a versioned key that survives a new instance (like a page reload) and resets when corrupt.
import { beforeEach, describe, expect, it } from 'vitest'
import { signedOutTopTen, SignedOutError } from '../signedOutTags'
import { topTenRepositoryContract } from '../topTenRepository.contract'
import { createLocalTopTenRepository } from './LocalTopTenRepository'

beforeEach(() => localStorage.clear())

// The demo account's key; any account key behaves the same.
const KEY = 'account-demo-top-ten'
const open = () => createLocalTopTenRepository(KEY)

topTenRepositoryContract('LocalTopTenRepository', open)

describe('LocalTopTenRepository storage', () => {
  it('persists under a versioned key and survives a new instance', async () => {
    await open().add(1091)
    expect(localStorage.getItem(`deepcuts:v1:${KEY}`)).toBe('[1091]')
    expect(await open().list()).toEqual([1091])
  })

  it.each([
    'not json',
    '{"films":[1]}',
    '[1,1]',
    '[-4]',
    JSON.stringify(Array.from({ length: 11 }, (_, i) => i + 1)),
  ])('resets corrupt data (%s) to empty', async (raw) => {
    localStorage.setItem(`deepcuts:v1:${KEY}`, raw)
    expect(await open().list()).toEqual([])
    expect(localStorage.getItem(`deepcuts:v1:${KEY}`)).toBeNull()
  })
})

describe('signed-out Top Ten', () => {
  it('is empty and refuses changes', async () => {
    expect(await signedOutTopTen.list()).toEqual([])
    await expect(signedOutTopTen.add(1)).rejects.toBeInstanceOf(SignedOutError)
    await expect(signedOutTopTen.remove(1)).rejects.toBeInstanceOf(SignedOutError)
  })
})
