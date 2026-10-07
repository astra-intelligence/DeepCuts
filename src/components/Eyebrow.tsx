// The small uppercase label above headings ("YOUR CORNER").
import type { ReactNode } from 'react'

// Colors an eyebrow may use. `contextual` follows the page accent (ADR-0020).
const TONES = {
  accent: 'text-accent',
  info: 'text-info',
  contextual: 'text-contextual',
  muted: 'text-fg-muted',
} as const

/** Small uppercase label above a heading (design v2). The tone carries no meaning on its own. */
export function Eyebrow({
  children,
  tone = 'accent',
  className = 'mb-2.5',
}: {
  children: ReactNode
  tone?: keyof typeof TONES
  className?: string
}) {
  return (
    <p className={`text-sm font-bold tracking-widest uppercase ${TONES[tone]} ${className}`}>
      {children}
    </p>
  )
}
