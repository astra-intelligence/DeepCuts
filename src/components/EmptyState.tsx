import type { ReactNode } from 'react'

/** A calm boxed message for empty lists, errors and no-result states. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="my-5 rounded-card border border-card-border bg-card-bg p-5 text-sm leading-relaxed text-fg-muted shadow-card">
      {children}
    </p>
  )
}
