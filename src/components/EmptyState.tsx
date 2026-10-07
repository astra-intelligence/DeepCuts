import type { ReactNode } from 'react'

/** A calm boxed message for empty lists, errors and no-result states. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="my-5 rounded-lg border border-border bg-surface-raised p-5 text-sm leading-relaxed text-fg-muted shadow-sm">
      {children}
    </p>
  )
}
