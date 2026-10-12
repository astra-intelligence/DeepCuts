// The heading block at the top of every main page.
import { Eyebrow } from './Eyebrow'

/** Eyebrow + display heading + lede used at the top of every main page (design v2). The eyebrow
 * is optional: Home leaves it out to keep its top quiet. */
export function PageHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string
  title: string
  lede?: string
}) {
  return (
    <div className="mt-1 mb-4">
      {eyebrow && <Eyebrow tone="contextual">{eyebrow}</Eyebrow>}
      {/* Each page has exactly one <h1>; useRouteFocus moves focus to it after navigation. */}
      <h1 className="font-display text-4xl leading-none tracking-tight text-balance wrap-anywhere">
        {title}
      </h1>
      {lede && <p className="mt-1.5 text-sm text-fg-muted">{lede}</p>}
    </div>
  )
}
