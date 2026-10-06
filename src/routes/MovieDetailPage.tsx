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
import { TagToggle } from '../components/TagToggle'
import { TAGS } from '../components/tags'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { useSetTag, useTagQueries } from '../session/tagQueries'
import { SkipLink } from './AppLayout'

const idSchema = z.coerce.number().int().positive().max(99_999_999)
const REGION = 'US'

/** Length-aware title scale from design v2 (55 and 95 character thresholds). */
function titleSize(title: string) {
  if (title.length > 95) return 'text-3xl md:text-5xl leading-tight'
  if (title.length > 55) return 'text-4xl md:text-6xl leading-none'
  return 'text-5xl md:text-7xl leading-none'
}

export function MovieDetailPage() {
  const parsed = idSchema.safeParse(useParams().id)
  return (
    <DetailLayout>{parsed.success ? <MovieDetail id={parsed.data} /> : <NotFound />}</DetailLayout>
  )
}

// Detail opens above the app shell (design v2): no tab bar; back, logo and search float on top.
function DetailLayout({ children }: { children: ReactNode }) {
  useRouteFocus()
  const navigate = useNavigate()
  const location = useLocation()
  // A direct visit has no history entry to return to, so back goes to Search instead.
  const back = () => (location.key === 'default' ? navigate('/search') : navigate(-1))
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
      <div className="absolute top-[max(5rem,calc(env(safe-area-inset-top)+4rem))] right-5 left-5 z-10 md:fixed md:top-[max(1.125rem,env(safe-area-inset-top))] md:right-auto md:left-1/2 md:w-[min(42vw,32.5rem)] md:-translate-x-1/2">
        <MovieSearch />
      </div>
      <main id="main">{children}</main>
    </div>
  )
}

function MovieDetail({ id }: { id: number }) {
  const movie = useQuery(movieQueries.detail(id))
  const providers = useQuery(movieQueries.providers(id))
  const tags = useQuery(useTagQueries().forMovie(id)).data
  const setTag = useSetTag()

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

      <div className="relative z-1 -mt-12 flex flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:mt-0 md:ml-auto md:min-h-svh md:w-[min(100%,36rem)] md:justify-center md:pt-24 md:pr-13 md:pb-10 md:pl-6">
        <h1
          className={`font-display tracking-tight text-balance [overflow-wrap:anywhere] ${titleSize(m.title)}`}
        >
          {m.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
          <span>{meta.join(' · ')}</span>
          {rating && (
            <span
              className="rounded-sm border border-border-control px-1.5 py-0.5"
              aria-label={`Rated ${rating}`}
            >
              {rating}
            </span>
          )}
        </p>
        {m.overview && <p className="my-3.5 leading-relaxed text-fg-muted">{m.overview}</p>}

        <div role="group" aria-label="Your tags" className="grid grid-cols-4 gap-1.5">
          {TAGS.map((t) => (
            <TagToggle
              key={t.tag}
              tag={t}
              isSelected={tags?.has(t.tag) ?? false}
              onChange={(on) => setTag.mutate({ tmdbId: m.id, tag: t.tag, on })}
              className="min-h-17 flex-col gap-1.5 px-1 text-center"
            />
          ))}
        </div>

        <section aria-labelledby="where-to-watch" className="mt-4">
          <h2
            id="where-to-watch"
            className="mb-2.5 text-sm font-bold tracking-[0.12em] text-fg-muted uppercase"
          >
            Where to watch ({REGION})
          </h2>
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
                        className="rounded-md"
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
          <p className="mt-3 text-xs text-fg-muted">Streaming availability data from JustWatch.</p>
        </section>
      </div>
    </article>
  )
}

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
