// The Top Ten notice (ADR-0036): the line Detail shows instead of the Top Ten sticker, e.g. "This is
// one of your top 10!" with a small Remove button, or "Your Top Ten is full."
//
// A placeholder by design, like TopTenSticker: it only shows a message and reports presses on
// Remove. DetailTopTen decides the message and what Remove does, so a later design can replace
// this component without touching any Top Ten logic.
import type { ReactNode, Ref } from 'react'
import { Button } from 'react-aria-components'
import { Icon } from './Icon'

/**
 * A short Top Ten message, with an optional Remove button.
 * @param children - The message.
 * @param onRemove - When given, a "Remove" button follows the message.
 * @param pending - True while the removal is being saved: Remove fades and ignores presses.
 * @param ref - The message itself, so the caller can move focus to it (it's focusable only from
 *   code, `tabIndex={-1}`); a screen reader then reads the message.
 */
export function TopTenNotice({
  children,
  onRemove,
  pending = false,
  className = '',
  ref,
}: {
  children: ReactNode
  onRemove?: () => void
  pending?: boolean
  className?: string
  ref?: Ref<HTMLParagraphElement>
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <p ref={ref} tabIndex={-1} className="flex items-center gap-2 font-semibold">
        {/* The star is the Top Ten's color (ADR-0035): decorative, always next to the words. */}
        <Icon name="star" className="size-5 shrink-0 text-favourite" />
        {children}
      </p>
      {onRemove && (
        <Button
          // Visible text "Remove" starts the accessible name, as WCAG 2.5.3 asks.
          aria-label="Remove from Top Ten"
          aria-disabled={pending}
          onPress={() => {
            if (!pending) onRemove()
          }}
          className="inline-flex min-h-11 items-center text-sm text-fg-muted underline underline-offset-4 hover:text-fg aria-disabled:opacity-70"
        >
          Remove
        </Button>
      )}
    </div>
  )
}
