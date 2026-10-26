// Display details for the three tags: label, icon, hint and color.
import type { SystemTag } from '@/domain/tagRules'
import type { IconName } from '@/components/ui/Icon'

/** A tag's display details. */
export interface TagDisplay {
  tag: SystemTag
  /** The tag's name, the same on its button, its list and in toasts: "More like this". */
  label: string
  icon: IconName
  /** The line under the button where there's room: "Save for later". */
  hint: string
}

// The three tags (ADR-0050). Color always comes with an icon and a label (ADR-0020).
export const TAGS: TagDisplay[] = [
  {
    tag: 'watchlist',
    label: 'Want to see',
    icon: 'bookmark',
    hint: 'Save for later',
  },
  {
    tag: 'liked',
    label: 'More like this',
    icon: 'heart',
    hint: 'Steers your picks',
  },
  {
    tag: 'disliked',
    label: 'Less like this',
    icon: 'ban',
    hint: 'Hide from feeds',
  },
]

/** Inline style that sets `--tag` to a tag's color token, e.g. for `text-(--tag)`. */
export const tagColor = (tag: SystemTag) => ({ '--tag': `var(--color-tag-${tag})` })
