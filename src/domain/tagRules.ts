// Tag rules (ADR-0017 + its amendment): the single source of truth for how the four tags
// interact (ADR-0013). Every place that changes tags (the local store today, Supabase later)
// goes through `applyTag`, so the rules can't drift between storage adapters.
//
// The rules, in plain words:
// - "Seen it" and "Want to see" exclude each other (you can't want to see what you've seen).
// - "Like" and "Dislike" exclude each other.
// - Disliking a film also takes it off "Want to see".
// - Adding to "Want to see" clears a dislike (amendment: wanting it means you've changed your mind).

/** The four tags a person can put on a film, in display order. */
export const SYSTEM_TAGS = ['seen', 'watchlist', 'liked', 'disliked'] as const
/** One of the four tags: `'seen' | 'watchlist' | 'liked' | 'disliked'`. */
export type SystemTag = (typeof SYSTEM_TAGS)[number]
/** The tags currently on one film. Read-only so callers can't bypass `applyTag`. */
export type TagSet = ReadonlySet<SystemTag>

// Adding the key removes every tag in its value. Removing a tag never adds or removes others.
const REMOVES: Record<SystemTag, readonly SystemTag[]> = {
  seen: ['watchlist'],
  watchlist: ['seen', 'disliked'],
  liked: ['disliked'],
  disliked: ['liked', 'watchlist'],
}

/**
 * Returns a film's tags after turning one tag on or off, applying the rules above.
 * Pure: the input set is never changed, a new set is returned.
 */
export function applyTag(current: TagSet, tag: SystemTag, on: boolean): TagSet {
  const next = new Set(current)
  // Turning a tag off only removes that tag.
  if (!on) {
    next.delete(tag)
    return next
  }
  // Turning a tag on first clears the tags it conflicts with, then adds it.
  for (const removed of REMOVES[tag]) next.delete(removed)
  next.add(tag)
  return next
}

/** A disliked film is excluded from Discover, recommendations and onboarding picks. */
export function isInFeeds(tags: TagSet): boolean {
  return !tags.has('disliked')
}

/**
 * Whether a film shows on a given list in My Lists. A disliked film appears only on the
 * Disliked list, even if it somehow carries another tag (e.g. from an older import).
 */
export function isOnList(tags: TagSet, list: SystemTag): boolean {
  return tags.has(list) && (list === 'disliked' || isInFeeds(tags))
}

/**
 * The tag changes that take a film from `current` back to `previous` (an undo), in an order
 * that's safe under the rules above: removals first, then additions. `previous` was a valid set,
 * so none of its tags conflict and re-adding them never removes another of them.
 * Feed each step to `applyTag` (or a repository's `setTag`) in turn.
 */
export function restoreSteps(current: TagSet, previous: TagSet): { tag: SystemTag; on: boolean }[] {
  const off = SYSTEM_TAGS.filter((t) => current.has(t) && !previous.has(t))
  const on = SYSTEM_TAGS.filter((t) => previous.has(t) && !current.has(t))
  return [...off.map((tag) => ({ tag, on: false })), ...on.map((tag) => ({ tag, on: true }))]
}
