// The small uppercase label above headings ("YOUR CORNER").
import type { ReactNode } from 'react'

// Colors an eyebrow may use. `contextual` follows the page accent (ADR-0020).
const TONES = {
  accent: 'text-accent',
  contextual: 'text-contextual',
  muted: 'text-fg-muted',
} as const

/**
 * Small uppercase label above a heading (design v2). The tone carries no meaning on its own.
 * @param as - `h2` when the label is itself a section's heading (Home's sections), so the
 *   page's heading outline stays intact.
 */
export function Eyebrow({
  children,
  tone = 'accent',
  className = 'mb-2.5',
  as: Tag = 'p',
  id,
}: {
  children: ReactNode
  tone?: keyof typeof TONES
  className?: string
  as?: 'p' | 'h2'
  id?: string
}) {
  return (
    <Tag
      id={id}
      className={`text-sm font-bold tracking-widest uppercase ${TONES[tone]} ${className}`}
    >
      {children}
    </Tag>
  )
}
