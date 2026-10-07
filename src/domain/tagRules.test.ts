// Tests for the tag rules (ADR-0017): which tags exclude which, and what appears in feeds and lists.
import { describe, expect, it } from 'vitest'
import { applyTag, isInFeeds, isOnList, type SystemTag, type TagSet } from './tagRules'

const set = (...tags: SystemTag[]): TagSet => new Set(tags)
const sorted = (tags: TagSet) => [...tags].sort()

describe('applyTag (ADR-0017)', () => {
  it.each<[SystemTag[], SystemTag, SystemTag[]]>([
    [['watchlist'], 'seen', ['seen']],
    [['seen', 'disliked'], 'watchlist', ['watchlist']],
    [['disliked'], 'liked', ['liked']],
    [['liked', 'watchlist'], 'disliked', ['disliked']],
    // Signals stay independent: like does not imply seen; seen keeps taste tags.
    [[], 'liked', ['liked']],
    [['liked'], 'seen', ['liked', 'seen']],
    [['disliked'], 'seen', ['disliked', 'seen']],
    [['liked', 'seen'], 'liked', ['liked', 'seen']],
  ])('%j + %s → %j', (before, tag, after) => {
    expect(sorted(applyTag(set(...before), tag, true))).toEqual(after)
  })

  it('removing a tag touches nothing else', () => {
    expect(sorted(applyTag(set('liked', 'seen'), 'liked', false))).toEqual(['seen'])
    expect(sorted(applyTag(set('seen'), 'watchlist', false))).toEqual(['seen'])
  })

  it('never mutates the input', () => {
    const before = set('watchlist')
    applyTag(before, 'seen', true)
    expect(sorted(before)).toEqual(['watchlist'])
  })
})

describe('feed and list visibility', () => {
  it('disliked films leave every feed', () => {
    expect(isInFeeds(set('seen', 'liked'))).toBe(true)
    expect(isInFeeds(set('disliked'))).toBe(false)
  })

  it('disliked films appear only on the Disliked list', () => {
    expect(isOnList(set('seen', 'disliked'), 'disliked')).toBe(true)
    expect(isOnList(set('seen', 'disliked'), 'seen')).toBe(false)
    expect(isOnList(set('seen'), 'seen')).toBe(true)
    expect(isOnList(set('seen'), 'liked')).toBe(false)
  })
})
