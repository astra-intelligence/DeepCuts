// The three quick actions on a Discovery pick (issue #76; owner picked layout A with stamps,
// 2026-10-15): save it, like it, or wave it off, straight from Home without opening Detail. Each
// is one of the three tags (ADR-0050; Like replaced Seen it), with the words the shelf, the stamp
// and the toast use.
import type { SystemTag } from '@/domain/tagRules'
import type { IconName } from '@/components/ui/Icon'

/** One quick action: its tag and every piece of text that goes with it. */
export interface QuickAction {
  tag: SystemTag
  /** The full name, as on Detail's tag buttons where it exists: "Want to see". */
  label: string
  /** The short label under its icon on the strip, which is only about 43px wide on phones. */
  short: string
  /** The tag's icon, as on Detail's tag buttons (tags.ts). */
  icon: IconName
  /** Stamped on the box once done: "On your watchlist". */
  stamp: string
  /** The toast: "Added The Fly to your watchlist." */
  done: (title: string) => string
}

/** The strip's three actions, left to right. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    tag: 'watchlist',
    label: 'Want to see',
    short: 'Want',
    icon: 'bookmark',
    stamp: 'On your watchlist',
    done: (title) => `Added ${title} to your watchlist.`,
  },
  {
    // You've seen it and liked it: it moves to My Lists → Liked and seeds future picks.
    tag: 'liked',
    label: 'Like',
    short: 'Like',
    icon: 'heart',
    stamp: 'Liked it',
    done: (title) => `Liked ${title}. Your picks will follow it.`,
  },
  {
    // "Not for me" is the Dislike tag: the film moves to My Lists → Disliked.
    tag: 'disliked',
    label: 'Not for me',
    short: 'Nope',
    icon: 'ban',
    stamp: 'Not for me',
    done: (title) => `${title} won’t be picked again.`,
  },
]

const BY_TAG = Object.fromEntries(QUICK_ACTIONS.map((a) => [a.tag, a])) as Record<
  QuickAction['tag'],
  QuickAction
>

/** The quick action for a tag (its stamp and labels). */
export const quickAction = (tag: QuickAction['tag']): QuickAction => BY_TAG[tag]
