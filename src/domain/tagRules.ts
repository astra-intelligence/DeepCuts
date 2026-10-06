// Tag rules (ADR-0017 + its amendment). The single source of truth for how tags interact (ADR-0013).
export const SYSTEM_TAGS = ['seen', 'watchlist', 'liked', 'disliked'] as const
export type SystemTag = (typeof SYSTEM_TAGS)[number]
export type TagSet = ReadonlySet<SystemTag>

// Adding the key removes every tag in its value.
const REMOVES: Record<SystemTag, readonly SystemTag[]> = {
  seen: ['watchlist'],
  watchlist: ['seen', 'disliked'],
  liked: ['disliked'],
  disliked: ['liked', 'watchlist'],
}

export function applyTag(current: TagSet, tag: SystemTag, on: boolean): TagSet {
  const next = new Set(current)
  if (!on) {
    next.delete(tag)
    return next
  }
  for (const removed of REMOVES[tag]) next.delete(removed)
  next.add(tag)
  return next
}

/** A disliked film is excluded from Discover, recommendations and onboarding picks. */
export function isInFeeds(tags: TagSet): boolean {
  return !tags.has('disliked')
}

/** A disliked film appears only on the Disliked list. */
export function isOnList(tags: TagSet, list: SystemTag): boolean {
  return tags.has(list) && (list === 'disliked' || isInFeeds(tags))
}
