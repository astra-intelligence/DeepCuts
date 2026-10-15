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
// - Reordering (ADR-0041) only changes the order: the same films, each once. A new order that
//   adds, drops or repeats a film is refused, because it means the list changed somewhere else
//   (another tab or device) since the person started moving films.

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

/**
 * Thrown when a new order doesn't hold exactly the stored films (ADR-0041): the list changed
 * elsewhere, so the order the person chose was for a list that no longer exists.
 */
export class TopTenChangedError extends Error {
  constructor() {
    super('Your Top Ten changed somewhere else.')
    this.name = 'TopTenChangedError'
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

/**
 * Returns the list with `tmdbId` moved to `toIndex` (0 is #1); the films in between shift by one
 * place to make room (ADR-0041). An index past either end is clamped to it, and moving a film
 * that isn't on the list, or to where it already is, returns the same list. Pure.
 */
export function moveInTopTen(list: TopTenList, tmdbId: number, toIndex: number): TopTenList {
  const from = list.indexOf(tmdbId)
  if (from === -1) return list
  const to = Math.min(Math.max(Math.trunc(toIndex), 0), list.length - 1)
  if (to === from) return list
  const rest = list.filter((id) => id !== tmdbId)
  return [...rest.slice(0, to), tmdbId, ...rest.slice(to)]
}

/** Whether two lists hold the same films, each once, in any order (a valid reorder). */
export function isSameFilms(a: TopTenList, b: TopTenList): boolean {
  // Same length, no repeats on either side, and every film of `b` is in `a`.
  const films = new Set(a)
  return (
    a.length === b.length &&
    films.size === a.length &&
    new Set(b).size === b.length &&
    b.every((id) => films.has(id))
  )
}

/**
 * Returns `order` as the new list when it holds exactly the films of `list`; the person's new
 * ranking. Returns `list` itself when nothing moved, so stores can skip the write.
 * @throws TopTenChangedError when `order` adds, drops or repeats a film.
 */
export function reorderTopTen(list: TopTenList, order: TopTenList): TopTenList {
  if (!isSameFilms(list, order)) throw new TopTenChangedError()
  return order.every((id, i) => id === list[i]) ? list : [...order]
}
