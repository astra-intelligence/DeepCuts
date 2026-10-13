// Tests for seasonal windows: both ends included, local dates, and windows that wrap New Year.
import { describe, expect, it } from 'vitest'
import { currentSeason, inSeason, type SeasonWindow } from './seasons'

// Local-time dates (month is 1-based here for readability).
const on = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour)

const october: SeasonWindow = { start: { month: 10, day: 1 }, end: { month: 10, day: 31 } }
const newYear: SeasonWindow = { start: { month: 12, day: 26 }, end: { month: 1, day: 2 } }

describe('inSeason', () => {
  it('includes both the first and last day, from midnight to the last minute', () => {
    expect(inSeason(october, on(2026, 10, 1, 0))).toBe(true)
    expect(inSeason(october, new Date(2026, 9, 31, 23, 59, 59))).toBe(true)
  })

  it('excludes the days either side', () => {
    expect(inSeason(october, on(2026, 9, 30))).toBe(false)
    expect(inSeason(october, on(2026, 11, 1, 0))).toBe(false)
  })

  it('repeats every year', () => {
    expect(inSeason(october, on(2031, 10, 15))).toBe(true)
  })

  it('handles a window that wraps past New Year', () => {
    expect(inSeason(newYear, on(2026, 12, 26))).toBe(true)
    expect(inSeason(newYear, on(2027, 1, 2))).toBe(true)
    expect(inSeason(newYear, on(2027, 1, 3))).toBe(false)
    expect(inSeason(newYear, on(2026, 12, 25))).toBe(false)
  })
})

describe('currentSeason', () => {
  const seasons = [
    { id: 'halloween', window: october },
    { id: 'new-year', window: newYear },
  ]

  it('returns the matching entry', () => {
    expect(currentSeason(seasons, on(2026, 12, 31))?.id).toBe('new-year')
  })

  it('returns undefined outside every window', () => {
    expect(currentSeason(seasons, on(2026, 7, 4))).toBeUndefined()
  })

  it('lets the earlier entry win when windows overlap', () => {
    const overlap = [...seasons, { id: 'late-october', window: october }]
    expect(currentSeason(overlap, on(2026, 10, 20))?.id).toBe('halloween')
  })
})
