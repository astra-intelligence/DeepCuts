import { useId } from 'react'

// Film-strip frame: outer bar minus the inner window and 2×5 sprocket holes (even-odd fill).
const HOLES = [12, 29, 46, 63, 80]
  .flatMap((y) => [`M10 ${y}h16v9H10z`, `M494 ${y}h16v9h-16z`])
  .join('')
const FRAME = `M0 0h520v100H0z M36 8h448v84H36z ${HOLES}`

type LogoProps = { className?: string }

/**
 * Deep Cuts wordmark, rebuilt as code from the owner's artwork (docs/design/brand/).
 * Colors come from the brand token tier, the artwork's exact values (ADR-0023): the frame and
 * DEEP use the teal gradient, CUTS the gold. The logo never changes color with the page accent.
 */
export function Logo({ className }: LogoProps) {
  const gradientId = useId()
  return (
    <svg viewBox="0 0 520 100" role="img" aria-label="Deep Cuts" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--dc-brand-logo-gradient-start)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--dc-brand-logo-gradient-end)' }} />
        </linearGradient>
      </defs>
      <path d={FRAME} fillRule="evenodd" fill={`url(#${gradientId})`} />
      <text
        x="260"
        y="80"
        textAnchor="middle"
        fontSize="80"
        fontWeight="800"
        className="font-brand"
      >
        <tspan fill={`url(#${gradientId})`}>DEEP</tspan>
        <tspan dx="6" strokeWidth="3" fill="none" style={{ stroke: 'var(--dc-brand-logo-cuts)' }}>
          CUTS
        </tspan>
      </text>
    </svg>
  )
}
