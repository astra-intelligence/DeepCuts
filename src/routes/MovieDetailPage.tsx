import { useQuery } from '@tanstack/react-query'
import { ToggleButton } from 'react-aria-components'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { formatRuntime, imageUrl, providersFor, releaseYear } from '../api/tmdb'
import { Icon, type IconName } from '../components/Icon'

const idSchema = z.coerce.number().int().positive().max(99_999_999)
const REGION = 'US'

// Tag semantics per ADR-0017; wired to the TagRepository in Stage 3.
const TAGS: { label: string; icon: IconName }[] = [
  { label: 'Seen it', icon: 'eye' },
  { label: 'Want to see', icon: 'bookmark' },
  { label: 'Like', icon: 'thumbUp' },
  { label: 'Dislike', icon: 'thumbDown' },
]

export function MovieDetailPage() {
  const parsed = idSchema.safeParse(useParams().id)
  if (!parsed.success) return <NotFound />
  return <MovieDetail id={parsed.data} />
}

function MovieDetail({ id }: { id: number }) {
  const movie = useQuery(movieQueries.detail(id))
  const providers = useQuery(movieQueries.providers(id))

  if (movie.isPending) return <p role="status">Loading film…</p>
  if (movie.isError) return <NotFound />

  const m = movie.data
  const backdrop = imageUrl(m.backdrop_path, 'w1280')
  const meta = [
    releaseYear(m.release_date),
    formatRuntime(m.runtime),
    m.genres.map((g) => g.name).join(', '),
  ].filter(Boolean)
  const watch = providers.data ? providersFor(providers.data, REGION) : []

  return (
    <article className="relative -mx-4 -mt-6 lg:-mx-8 lg:grid lg:grid-cols-[1.35fr_1fr]">
      <title>{`${m.title} · Deep Cuts`}</title>
      <div className="relative h-[45svh] lg:h-[calc(100svh-5rem)]">
        {backdrop && (
          <img src={backdrop} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {/* Scrim keeps overlaid text readable over any image (ADR-0009). */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-surface/40 to-surface lg:bg-linear-to-r lg:via-transparent" />
      </div>
      <div className="relative -mt-24 px-4 pb-8 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:px-10">
        <Link
          to="/search"
          className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <Icon name="back" /> Back to search
        </Link>
        <h1 className="font-display text-5xl leading-none lg:text-7xl">{m.title}</h1>
        {meta.length > 0 && <p className="mt-3 text-sm text-fg-muted">{meta.join(' · ')}</p>}
        {m.overview && <p className="mt-4 max-w-prose leading-relaxed">{m.overview}</p>}

        <div role="group" aria-label="Your tags" className="mt-6 grid grid-cols-4 gap-2">
          {TAGS.map((tag) => (
            <ToggleButton
              key={tag.label}
              isDisabled
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-raised text-xs text-fg-muted disabled:opacity-60"
            >
              <Icon name={tag.icon} />
              {tag.label}
            </ToggleButton>
          ))}
        </div>
        <p className="mt-2 text-xs text-fg-muted">Tagging arrives in the next build stage.</p>

        <section aria-labelledby="where-to-watch" className="mt-8">
          <h2
            id="where-to-watch"
            className="text-xs font-bold tracking-widest text-fg-muted uppercase"
          >
            Where to watch ({REGION})
          </h2>
          {watch.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {watch.map((p) => {
                const logo = imageUrl(p.logo_path, 'w92')
                return (
                  <li
                    key={p.provider_id}
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-raised py-1 pr-3 pl-1 text-sm"
                  >
                    {logo && (
                      <img src={logo} alt="" width={32} height={32} className="rounded-md" />
                    )}
                    {p.provider_name}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">
              {providers.isPending
                ? 'Checking providers…'
                : 'Not streaming in your region right now.'}
            </p>
          )}
          <p className="mt-3 text-xs text-fg-muted">Streaming availability data from JustWatch.</p>
        </section>
      </div>
    </article>
  )
}

function NotFound() {
  return (
    <>
      <title>Film not found · Deep Cuts</title>
      <h1 className="font-display text-4xl">Film not found</h1>
      <p className="mt-2 text-fg-muted">
        We couldn’t find that film.{' '}
        <Link to="/search" className="text-info underline">
          Search instead
        </Link>
      </p>
    </>
  )
}
