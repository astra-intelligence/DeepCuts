// Top Ten rules (ADR-0036): the single source of truth for what a Top Ten list may hold.
//
// A Top Ten is a person's ten favourite films, in their own order (ADR-0033). It is a separate
// list from the four tags: adding a film here never changes its tags, and the other way round.
// Every place that changes a Top Ten (this browser's store, the server, the test fakes) goes
// through these functions, so the rules can't drift between storage adapters.
//
// The rules, in plain words:
// - At most ten films, and each film at most once.
// - The order is the person's ranking: position 1 first. Adding a film puts it at the end.
// - Removing a film closes the gap: everything below it moves up one place.
// - A full list refuses new films. Choosing a film to replace ("Are you sure this is a Top
//   Ten?") is part of the later management screen (ADR-0033), not these rules.

/** How many films a Top Ten holds. */
export const TOP_TEN_SIZE = 10

/** A Top Ten: TMDB film ids in ranked order, number one first. Read-only so callers use the rules. */
export type TopTenList = readonly number[]

/** Thrown when a film is added to a list that already holds ten. */
export class TopTenFullError extends Error {
  constructor() {
    super('Your Top Ten is full.')
    this.name = 'TopTenFullError'
  }
}

/** Whether the list has no room for another film. */
export const isTopTenFull = (list: TopTenList) => list.length >= TOP_TEN_SIZE

/**
 * Returns the list with `tmdbId` added at the end. Adding a film that's already there changes
 * nothing (so a double click, or two tabs, can't add it twice). Pure: returns a new array.
 * @throws TopTenFullError when the film is new and the list already holds ten.
 */
export function addToTopTen(list: TopTenList, tmdbId: number): TopTenList {
  if (list.includes(tmdbId)) return list
  if (isTopTenFull(list)) throw new TopTenFullError()
  return [...list, tmdbId]
}

/** Returns the list without `tmdbId`; the films below it move up. Removing a missing film is a no-op. */
export function removeFromTopTen(list: TopTenList, tmdbId: number): TopTenList {
  return list.filter((id) => id !== tmdbId)
}
