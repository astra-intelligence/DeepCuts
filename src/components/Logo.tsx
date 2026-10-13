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

// Each letter is drawn on a 50×100 grid; the x offset places it in its block.
const DEEP = [
  ['14', 'M0 0H30Q50 0 50 20V80Q50 100 30 100H0Z M17 17V83H28Q33 83 33 78V22Q33 17 28 17Z'],
  ['70', 'M0 0H46V17H17V41H40V58H17V83H46V100H0Z'],
  ['122', 'M0 0H46V17H17V41H40V58H17V83H46V100H0Z'],
  ['174', 'M0 0H32Q50 0 50 18V44Q50 62 32 62H17V100H0Z M17 17V45H28Q33 45 33 40V22Q33 17 28 17Z'],
]
const CUTS = [
  [
    '252',
    'M50 34V22Q50 0 25 0Q0 0 0 22V78Q0 100 25 100Q50 100 50 78V64H33V77Q33 84 25 84Q17 84 17 77V23Q17 16 25 16Q33 16 33 23V34Z',
  ],
  ['308', 'M0 0H17V77Q17 84 25 84Q33 84 33 77V0H50V78Q50 100 25 100Q0 100 0 78Z'],
  ['364', 'M0 0H48V17H32.5V100H15.5V17H0Z'],
  [
    '418',
    'M50 30V22Q50 0 25 0Q0 0 0 22V36Q0 48 12 55L33 67V77Q33 84 25 84Q17 84 17 77V68H0V78Q0 100 25 100Q50 100 50 78V62Q50 50 38 43L17 31V23Q17 16 25 16Q33 16 33 23V30Z',
  ],
]

/** The SVG attributes every logo artwork must spread onto its root `<svg>`. */
export type LogoArtProps = {
  className?: string | undefined
  role?: 'img' | undefined
  'aria-label'?: string | undefined
  'aria-hidden'?: true | undefined
}

/** Holiday artwork that replaces the standard wordmark while `window` is in season. */
type SeasonalLogo = { id: string; window: SeasonWindow; Art: ComponentType<LogoArtProps> }

/** Every seasonal logo, checked in order; the first in season wins. Empty means always standard. */
const SEASONAL_LOGOS: readonly SeasonalLogo[] = []

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
