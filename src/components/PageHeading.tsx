// The heading block at the top of every main page: an optional label, the poster-style headline
// and a lede (ADR-0040).
import { Eyebrow } from './Eyebrow'

/**
 * Label + display headline + lede, used at the top of every main page.
 * @param highlight - Words that end the headline in blood red with a hard shadow ("close at
 *   hand" on Home). Large text only: blood on ink is about 3.3:1, which passes only at this size.
 * @param size - `hero` for Home's larger headline; `page` for every other page.
 */
export function PageHeading({
  eyebrow,
  title,
  highlight,
  lede,
  size = 'page',
}: {
  eyebrow?: string
  title: string
  highlight?: string
  lede?: string
  size?: 'hero' | 'page'
}) {
  return (
    <div className="mt-2 mb-8">
      {eyebrow && <Eyebrow tone="contextual">{eyebrow}</Eyebrow>}
      {/* Each page has exactly one <h1>; useRouteFocus moves focus to it after navigation. The
          highlight is part of the same heading, so it reads as one sentence. */}
      <h1
        className={`font-display leading-none tracking-wide text-balance wrap-anywhere uppercase ${
          size === 'hero' ? 'text-5xl md:text-7xl' : 'text-5xl'
        }`}
      >
        {title}
        {highlight && (
          <>
            {' '}
            <span className="text-danger text-shadow-hard">{highlight}</span>
          </>
        )}
      </h1>
      {lede && <p className="mt-4 max-w-prose text-lg text-fg-soft">{lede}</p>}
    </div>
  )
}
