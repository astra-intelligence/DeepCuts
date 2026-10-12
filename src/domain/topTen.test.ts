// Tests for the Top Ten rules (ADR-0036): ten films at most, no duplicates, ranked order kept.
import { describe, expect, it } from 'vitest'
import {
  addToTopTen,
  isTopTenFull,
  removeFromTopTen,
  TOP_TEN_SIZE,
  TopTenFullError,
} from './topTen'

const full = Array.from({ length: TOP_TEN_SIZE }, (_, i) => i + 1)

describe('Top Ten rules', () => {
  it('adds a new film at the end without changing the input', () => {
    const list = [7, 8]
    expect(addToTopTen(list, 9)).toEqual([7, 8, 9])
    expect(list).toEqual([7, 8])
  })

  it('returns the same list when the film is already there', () => {
    const list = [7, 8]
    expect(addToTopTen(list, 7)).toBe(list)
    expect(addToTopTen(full, 3)).toBe(full)
  })

  it('refuses an eleventh film', () => {
    expect(isTopTenFull(full)).toBe(true)
    expect(isTopTenFull(full.slice(1))).toBe(false)
    expect(() => addToTopTen(full, 11)).toThrow(TopTenFullError)
  })

  it('removes a film and closes the gap', () => {
    expect(removeFromTopTen([1, 2, 3], 2)).toEqual([1, 3])
    expect(removeFromTopTen([1, 2, 3], 9)).toEqual([1, 2, 3])
  })
})
