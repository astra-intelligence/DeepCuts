// Seasonal windows: recurring calendar date ranges (e.g. "all of October") that come back every
// year. The logo uses them to show holiday artwork; anything else date-themed can reuse them.
// Dates are compared in the viewer's local time zone, so the season starts at their midnight.

/** A month (1–12) and day of the month, with no year: the window repeats every year. */
export type MonthDay = { month: number; day: number }

/**
 * A recurring date range, both ends included. `end` may fall before `start` to wrap past New Year
 * (e.g. Dec 26 – Jan 2).
 */
export type SeasonWindow = { start: MonthDay; end: MonthDay }

// Turns a month and day into one sortable number (Oct 31 → 1031), so ranges compare simply.
const ordinal = ({ month, day }: MonthDay) => month * 100 + day

/** True when `date` (local time) falls inside `window`. */
export function inSeason(window: SeasonWindow, date: Date): boolean {
  const today = ordinal({ month: date.getMonth() + 1, day: date.getDate() })
  const start = ordinal(window.start)
  const end = ordinal(window.end)
  // A window that wraps past New Year matches the end of one year or the start of the next.
  return start <= end ? today >= start && today <= end : today >= start || today <= end
}

/**
 * The first entry whose window contains `date`, or undefined when none does. List order decides
 * which one wins if two windows ever overlap.
 */
export function currentSeason<T extends { window: SeasonWindow }>(
  seasons: readonly T[],
  date: Date,
): T | undefined {
  return seasons.find((season) => inSeason(season.window, date))
}
