// The Detail page (/movie/:id): one film's details, your tags for it, and where to watch it.
//
// Information only (ADR-0018): no ratings or reviews of our own. It has its own full-bleed
// layout without the tab bar, with the film's backdrop behind the page.
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { certification, formatRuntime, imageUrl, providersFor, releaseYear } from '../api/tmdb'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { MovieSearch } from '../components/MovieSearch'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { SkipLink } from './AppLayout'
import { DetailTags } from './DetailTags'

// The :id in the URL is untrusted: it must be a positive whole number of sensible size.
const idSchema = z.coerce.number().int().positive().max(99_999_999)
// Ratings and streaming services are shown for one country for now.
const REGION = 'US'

/** Length-aware title scale from design v2 (55 and 95 character thresholds). */
function titleSize(title: string) {
  if (title.length > 95) return 'text-3xl md:text-5xl leading-tight'
  if (title.length > 55) return 'text-4xl md:text-6xl leading-none'
  return 'text-5xl md:text-7xl leading-none'
}

/** The Detail page: shows the film, or "not found" for a malformed id. */
export function MovieDetailPage() {
  const parsed = idSchema.safeParse(useParams().id)
  return (
    <DetailLayout>{parsed.success ? <MovieDetail id={parsed.data} /> : <NotFound />}</DetailLayout>
  )
}

/**
 * "Back", shared by the top button and the one at the end of the page: the previous screen, or
 * Search on a direct visit (which has no history entry to return to).
 */
function useBack() {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key === 'default' ? navigate('/search') : navigate(-1))
}

// Detail opens above the app shell (design v2): no tab bar; back, logo and search float on top.
function DetailLayout({ children }: { children: ReactNode }) {
  useRouteFocus()
  const back = useBack()
  return (
    <div className="relative mx-auto min-h-svh w-full max-w-360 overflow-x-clip">
      <SkipLink />
      <Button
        onPress={back}
        aria-label="Back to previous screen"
        className="absolute top-[max(1.125rem,env(safe-area-inset-top))] left-5 z-10 grid size-12 place-items-center rounded-full border border-border-control bg-surface-raised/80 backdrop-blur-md md:fixed"
      >
        <Icon name="back" className="size-6" />
      </Button>
      <Link
        to="/discover"
        aria-label="Deep Cuts, go to Discover"
        className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-5 z-10 inline-flex min-h-11 items-center md:fixed md:right-8"
      >
        <Logo className="h-7 w-auto" />
      </Link>
      <div className="absolute top-[max(5rem,calc(env(safe-area-inset-top)+4rem))] right-5 left-5 z-10 md:fixed md:top-[max(1.125rem,env(safe-area-inset-top))] md:right-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2">
        <MovieSearch />
      </div>
      <main id="main">{children}</main>
    </div>
  )
}

// The film itself, once its id is known to be valid.
function MovieDetail({ id }: { id: number }) {
  const movie = useQuery(movieQueries.detail(id))
  const providers = useQuery(movieQueries.providers(id))
  const back = useBack()

  if (movie.isPending)
    return (
      <p role="status" className="px-5 pt-40">
        Loading film…
      </p>
    )
  if (movie.isError) return <NotFound />

  const m = movie.data
  const backdrop = imageUrl(m.backdrop_path, 'w1280')
  const rating = certification(m, REGION)
  // "1982 · 1h 49m · Horror, Science Fiction" (empty parts are skipped).
  const meta = [
    releaseYear(m.release_date),
    formatRuntime(m.runtime),
    m.genres.map((g) => g.name).join(', '),
  ].filter(Boolean)
  const watch = providers.data ? providersFor(providers.data, REGION) : []

  return (
    <article className="relative min-h-svh">
      <title>{`${m.title} · Deep Cuts`}</title>
      {/* Phones: the backdrop sits at the top at a gentle 4:3 crop and fades into the page.
          From md it fills the whole viewport at its natural shape, and an overlay darkens the
          right side where the text sits. Scrims keep text readable over any image (ADR-0009). */}
      <div className="relative aspect-4/3 w-full md:fixed md:inset-0 md:aspect-auto">
        {backdrop && <img src={backdrop} alt="" className="size-full object-cover object-top" />}
        <div className="absolute inset-0 bg-linear-to-b from-surface/70 via-transparent via-35% to-surface md:hidden" />
        <div className="absolute inset-0 hidden bg-linear-to-r from-transparent from-25% via-surface/85 via-55% to-surface to-75% md:block" />
        <div className="absolute inset-0 hidden bg-linear-to-b from-surface/60 via-transparent via-20% md:block" />
      </div>

      <div className="relative z-1 -mt-12 flex flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:mt-0 md:ml-auto md:min-h-svh md:w-full md:max-w-xl md:justify-center md:pt-24 md:pr-13 md:pb-10 md:pl-6">
        <h1
          className={`font-display tracking-tight text-balance wrap-anywhere ${titleSize(m.title)}`}
        >
          {m.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
          <span>{meta.join(' · ')}</span>
          {rating && (
            <span
              className="rounded-subtle border border-border-control px-1.5 py-0.5"
              aria-label={`Rated ${rating}`}
            >
              {rating}
            </span>
          )}
        </p>
        {m.overview && <p className="my-3.5 leading-relaxed text-fg-muted">{m.overview}</p>}

        {/* The four tag toggles, with Save and Cancel once anything changes (ADR-0017 rules). */}
        <DetailTags movieId={m.id} title={m.title} />

        <section aria-labelledby="where-to-watch" className="mt-4">
          <h2
            id="where-to-watch"
            className="mb-2.5 text-sm font-bold tracking-widest text-fg-muted uppercase"
          >
            Where to watch ({REGION})
          </h2>
          {/* Service logos (with the name as alt text), or a short message. */}
          {watch.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-3.5">
              {watch.map((p) => {
                const logo = imageUrl(p.logo_path, 'w92')
                return (
                  <li key={p.provider_id} title={p.provider_name}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={p.provider_name}
                        width={32}
                        height={32}
                        className="rounded-control"
                      />
                    ) : (
                      <span className="text-sm">{p.provider_name}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">
              {providers.isPending
                ? 'Checking providers…'
                : 'Not streaming in your region right now.'}
            </p>
          )}
          {/* Attribution required for JustWatch data. */}
          <p className="mt-3 text-xs text-fg-muted">Streaming availability data from JustWatch.</p>
        </section>

        {/* A second way back, right below the tags: on desktop the top back button sits in the
            far corner, a long way from where you've just tagged the film. */}
        <Button
          onPress={back}
          className="mt-6 flex min-h-11 items-center justify-center gap-2 self-start rounded-button border border-button-secondary-border bg-button-secondary-bg px-4 text-sm font-semibold text-button-secondary-fg hover:border-accent"
        >
          <Icon name="back" />
          Back
        </Button>
      </div>
    </article>
  )
}

// Shown for an unknown or malformed film id.
function NotFound() {
  return (
    <div className="px-5 pt-40">
      <title>Film not found · Deep Cuts</title>
      <h1 className="font-display text-4xl">Film not found</h1>
      <p className="mt-2 text-fg-muted">
        We couldn’t find that film.{' '}
        <Link to="/search" className="text-info underline">
          Search instead
        </Link>
      </p>
    </div>
  )
}
