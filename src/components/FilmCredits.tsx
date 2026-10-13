// The small text lines under a film on Home and My Lists: why it was picked, and who made it.
import type { Credits } from '../api/tmdb'

/** "Because you liked Alien and The Thing" (nothing without titles). */
export function Because({ titles }: { titles: string[] | undefined }) {
  if (!titles?.length) return null
  return (
    <span className="mt-1 block font-label text-sm text-accent">
      Because you liked <cite className="not-italic">{titles.join(' and ')}</cite>
    </span>
  )
}

/**
 * "Director: John Carpenter" and "Writer: Bill Lancaster" (plural with two names). A line is
 * left out when TMDB has no such credit, and both are left out until the details load.
 */
export function CreditLines({ credits }: { credits: Credits | undefined }) {
  const lines = [
    {
      label: (credits?.directors.length ?? 0) > 1 ? 'Directors' : 'Director',
      names: credits?.directors ?? [],
    },
    {
      label: (credits?.writers.length ?? 0) > 1 ? 'Writers' : 'Writer',
      names: credits?.writers ?? [],
    },
  ].filter((l) => l.names.length > 0)
  return (
    // Two reserved text rows let credits arrive without moving this card or anything below it.
    <span data-credit-lines="" className="mt-1 block min-h-10">
      {lines.map((l) => (
        <span key={l.label} className="block text-sm text-fg-muted">
          {l.label}: <span className="text-fg">{l.names.join(', ')}</span>
        </span>
      ))}
    </span>
  )
}
