// The Deep Cuts wordmark (ADR-0040): two skewed blocks, "DEEP" in bone on blood and "CUTS" in ink
// on bone. Drawn inline from the owner's artwork (docs/design/triple-feature/deep-cuts-logo.svg),
// with the letters as vector paths, so it looks identical before any font loads and stays sharp
// at any size.
//
// Holidays: from time to time the logo swaps in seasonal artwork (e.g. all of October for
// Halloween). Each holiday is one entry in SEASONAL_LOGOS below, with its own date window and
// artwork component; the rest of the year shows the standard wordmark.

import type { ComponentType } from 'react'
import { currentSeason, type SeasonWindow } from '../domain/seasons'
import { HalloweenLogo } from './HalloweenLogo'
import { CUTS, DEEP, type LogoArtProps } from './logoGlyphs'

/** Holiday artwork that replaces the standard wordmark while `window` is in season. */
type SeasonalLogo = { id: string; window: SeasonWindow; Art: ComponentType<LogoArtProps> }

/** Every seasonal logo, checked in order; the first in season wins. */
const SEASONAL_LOGOS: readonly SeasonalLogo[] = [
  // All of October (owner, 2026-10-13).
  {
    id: 'halloween',
    window: { start: { month: 10, day: 1 }, end: { month: 10, day: 31 } },
    Art: HalloweenLogo,
  },
]

type LogoProps = {
  className?: string
  decorative?: boolean
  /** The day to pick artwork for. Defaults to today; stories and tests pass a fixed date. */
  date?: Date
}

/**
 * The Deep Cuts wordmark, or holiday artwork when one is in season. Colors come from the brand
 * token tier, the artwork's exact values (ADR-0023), so the logo never changes with the page
 * accent. Size it by height; the width follows. Pass `decorative` when a link around it already
 * says "Deep Cuts". Every variant keeps the accessible name "Deep Cuts": the brand doesn't change,
 * only its costume.
 */
export function Logo({ className, decorative = false, date = new Date() }: LogoProps) {
  const Art = currentSeason(SEASONAL_LOGOS, date)?.Art ?? StandardLogo
  return (
    <Art
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Deep Cuts'}
      aria-hidden={decorative || undefined}
    />
  )
}

/** The year-round wordmark (ADR-0040). */
function StandardLogo(props: LogoArtProps) {
  return (
    <svg viewBox="0 0 502 128" {...props}>
      {/* The whole mark leans 8° to the right, like a poster headline. */}
      <g transform="translate(18 2) skewX(-8)">
        <rect width="238" height="124" style={{ fill: 'var(--dc-brand-logo-red)' }} />
        <rect x="238" width="244" height="124" style={{ fill: 'var(--dc-brand-logo-bone)' }} />
        <g fillRule="evenodd" style={{ fill: 'var(--dc-brand-logo-bone)' }}>
          {DEEP.map(([x, d]) => (
            <path key={x} transform={`translate(${x} 12)`} d={d} />
          ))}
        </g>
        <g fillRule="evenodd" style={{ fill: 'var(--dc-brand-logo-ink)' }}>
          {CUTS.map(([x, d]) => (
            <path key={x} transform={`translate(${x} 12)`} d={d} />
          ))}
        </g>
      </g>
    </svg>
  )
}
