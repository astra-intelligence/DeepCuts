import type { SystemTag } from '../domain/tagRules'
import type { IconName } from './Icon'

// The four ADR-0017 tags. Color always comes with an icon and a label (ADR-0020).
export const TAGS: { tag: SystemTag; label: string; icon: IconName; hint: string }[] = [
  { tag: 'seen', label: 'Seen it', icon: 'eye', hint: 'Already watched' },
  { tag: 'watchlist', label: 'Want to see', icon: 'bookmark', hint: 'Save for later' },
  { tag: 'liked', label: 'Like', icon: 'heart', hint: 'More like this' },
  { tag: 'disliked', label: 'Dislike', icon: 'ban', hint: 'Hide from feeds' },
]

export const tagColor = (tag: SystemTag) => ({ '--tag': `var(--color-tag-${tag})` })
