// The three quick actions on a Discovery pick (issue #76; owner picked layout A with stamps,
// 2026-10-15): save it, mark it seen, or wave it off, straight from Home without opening Detail.
// Each is one of the ADR-0017 tags, with the words the shelf, the stamp and the toast use.
import type { SystemTag } from '../domain/tagRules'
import type { IconName } from './Icon'

/** One quick action: its tag and every piece of text that goes with it. */
export interface QuickAction {
  tag: Extract<SystemTag, 'watchlist' | 'seen' | 'disliked'>
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
    tag: 'seen',
    label: 'Seen it',
    short: 'Seen',
    icon: 'eye',
    stamp: 'Seen it',
    done: (title) => `Marked ${title} as seen.`,
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
