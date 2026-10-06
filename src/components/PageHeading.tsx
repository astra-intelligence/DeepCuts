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
      <p className="mb-2.5 text-sm font-bold tracking-[0.15em] text-contextual uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-4xl leading-none tracking-tight text-balance [overflow-wrap:anywhere]">
        {title}
      </h1>
      {lede && <p className="mt-1.5 text-sm text-fg-muted">{lede}</p>}
    </div>
  )
}
