import { Eyebrow } from './Eyebrow'

/** Eyebrow + display heading + lede used at the top of every main page (design v2). */
export function PageHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string
  title: string
  lede?: string
}) {
  return (
    <div className="mt-1 mb-4">
      <Eyebrow tone="contextual">{eyebrow}</Eyebrow>
      <h1 className="font-display text-4xl leading-none tracking-tight text-balance wrap-anywhere">
        {title}
      </h1>
      {lede && <p className="mt-1.5 text-sm text-fg-muted">{lede}</p>}
    </div>
  )
}
