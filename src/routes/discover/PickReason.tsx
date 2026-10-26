// The reason line under a Discovery pick (ADR-0040 §8): "Because you liked The Thing", which opens
// a small bubble with the full sentence ("Same director and writer as The Thing", pickReason.ts).
//
// The full sentence took too much room on phone tiles, so it lives behind the short line (owner,
// 2026-10-26). Tap, click or Enter opens it; Escape or tapping away closes it. A popover rather
// than a hover tooltip because touch has no hover, and the app is mobile-first (ADR-0021). The
// whole tile is a link, so this button sits just after it, above the quick actions: a button
// inside a link isn't allowed. React Aria's DialogTrigger gives it focus handling and Escape.
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import { Icon } from '@/components/ui/Icon'

/** Why a pick was picked: the liked film it came from, and the full sentence. */
export interface PickWhy {
  /** The first liked film that suggested it, when one did. */
  liked?: string | undefined
  /** The full sentence from the scorer's facts. */
  reason: string
}

// The line's look, shared by the plain text and the button: the typewriter face in the accent.
const line = 'mt-2 block text-left font-label text-sm text-accent'

/**
 * The short reason line, opening the full sentence when it says more.
 * @param title - The film's title, so each button's name says which pick it explains.
 */
export function PickReason({ why, title }: { why: PickWhy; title: string }) {
  const short = why.liked ? `Because you liked ${why.liked}` : why.reason
  // Nothing more to show (the plain "Because you liked …"): just the line, no button.
  if (short === why.reason) return <span className={line}>{short}</span>
  return (
    <DialogTrigger>
      {/* 44px tall at least, for touch, like the quick actions below it. The dotted underline
          and the icon say it opens something. */}
      <Button
        className={`${line} min-h-11 cursor-pointer underline decoration-dotted underline-offset-4 hover:decoration-solid`}
      >
        {short}
        <Icon name="info" className="ml-1 inline size-4 align-text-bottom" />
        <span className="sr-only">: why {title} was picked</span>
      </Button>
      <Popover
        placement="bottom start"
        offset={4}
        className="max-w-64 border-2 border-popover-border bg-popover-bg p-3 shadow-popover"
      >
        <Dialog aria-label={`Why ${title} was picked`} className="text-sm text-fg outline-none">
          {why.reason}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
