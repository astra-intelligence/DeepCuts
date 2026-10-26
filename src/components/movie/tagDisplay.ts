// Display details for the three tags: label, button text, icon, hint and color.
import type { SystemTag } from '@/domain/tagRules'
import type { IconName } from '@/components/ui/Icon'

/** A tag's display details. */
export interface TagDisplay {
  tag: SystemTag
  /** The tag's name, as on My Lists and in toasts: "Like". */
  label: string
  /** The words on its toggle button on Detail and Tune, which say what the tag does to picks. */
  button: string
  icon: IconName
  /** The line under the button where there's room: "Save for later". */
  hint: string
}

// The three tags (ADR-0050). Color always comes with an icon and a label (ADR-0020).
export const TAGS: TagDisplay[] = [
  {
    tag: 'watchlist',
    label: 'Want to see',
    button: 'Want to see',
    icon: 'bookmark',
    hint: 'Save for later',
  },
  {
    tag: 'liked',
    label: 'Like',
    button: 'More like this',
    icon: 'heart',
    hint: 'Seen it, liked it',
  },
  {
    tag: 'disliked',
    label: 'Dislike',
    button: 'Less like this',
    icon: 'ban',
    hint: 'Hide from feeds',
  },
]

/** Inline style that sets `--tag` to a tag's color token, e.g. for `text-(--tag)`. */
export const tagColor = (tag: SystemTag) => ({ '--tag': `var(--color-tag-${tag})` })
