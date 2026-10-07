// The message shown when a tag change didn't save (for example, the server refused it or the
// network dropped). Without it a failed save looked like a button that did nothing.
// Same alert style as the sign-in and registration failures.
import { Icon } from './Icon'

/**
 * An alert that a tag change wasn't saved. Render it only after a failed save; it's announced
 * at once (`role="alert"`). The button already shows the unchanged state, so it says so.
 */
export function TagSaveError({ className = '' }: { className?: string }) {
  return (
    <p
      role="alert"
      className={`flex gap-2.5 rounded-container border border-fg-danger bg-fg-danger/10 p-3 text-sm ${className}`}
    >
      <Icon name="ban" className="size-5 shrink-0 text-fg-danger" />
      Your change wasn’t saved. Nothing was changed. Try again.
    </p>
  )
}
