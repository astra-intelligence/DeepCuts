// Discover (/discover): a feed of films picked for you.
//
// A large featured film on top, then a grid of 16 more. With likes, the picks come from the
// recommendation scorer (ADR-0026) and show a "% match" and why. Without likes, it shows popular
// films (minus disliked ones) and suggests liking a few films. Every card names the film's
// director and writer, from its details (the same cached call the Detail page makes).
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { movieQueries } from '../api/queries'
import { creditsOf, imageUrl, releaseYear, type Credits, type MovieSummary } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { EmptyState } from '../components/EmptyState'
import { GenreSticker } from '../components/GenreSticker'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { VhsBox } from '../components/VhsBox'
import { genreTone, primaryGenreName } from '../domain/genres'
import { useTagQueries } from '../session/tagQueries'
import { useRecommendations } from '../session/useRecommendations'

// For the eyebrow, e.g. "Tuesday's edit".
const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

/**
 * With likes, Discover ranks films with the scorer (ADR-0026). Without likes it shows popular
 * films minus disliked ones, and says how to tune it.
 */
export function DiscoverPage() {
  // 17 = one featured film + 16 grid tiles.
  const tuned = useRecommendations(17)
  const popular = useQuery(movieQueries.discover())
  const excluded = useQuery(useTagQueries().feedExclusions()).data

  // Use the scorer's picks when there are likes and the scorer has (or is still finding) picks;
  // otherwise fall back to popular films so the page is never empty.
  const usePicks = tuned.hasLikes && (tuned.loading || tuned.recommendations.length > 0)
  // While the scorer is still loading (both passes, ADR-0028), show nothing rather than early
  // picks that would reshuffle when the re-rank arrives.
  const items: Item[] = usePicks
    ? (tuned.loading ? [] : tuned.recommendations).map((r) => ({
        movie: r.movie,
        match: r.match,
        because: r.because,
      }))
    : (popular.data?.results ?? []).filter((m) => !excluded?.has(m.id)).map((movie) => ({ movie }))
  const loading = usePicks ? tuned.loading : popular.isPending
  // Director and writer for each card on show: one details call per film, cached for a day and
  // shared with Detail (and with the scorer's re-rank, so most picks are already loaded). A card
  // shows its film at once and the credit lines fill in when its details arrive.
  const shown = items.slice(0, 17)
  const details = useQueries({ queries: shown.map((i) => movieQueries.detail(i.movie.id)) })
  const withCredits = shown.map((item, i) => {
    const data = details[i]?.data
    return data ? { ...item, credits: creditsOf(data) } : item
  })
  // The first film is featured; the rest fill the grid.
  const [feature, ...rest] = withCredits
  // Skeletons cover only the request that determines which films belong in the list. Holding the
  // poster for secondary credits delays the page's largest paint; cards instead reserve the two
  // credit lines below and fill them independently when each detail request completes.
  const featureLoading = loading
  const gridLoading = loading

  return (
    <>
      <title>Discover · Deep Cuts</title>
      <PageHeading
        eyebrow={`${WEEKDAY.format(new Date())}’s edit`}
        title="Found for you"
        lede={
          usePicks
            ? 'Picked from the films you liked, beyond the obvious.'
            : 'Popular films worth staying up for. Like a few films to tune this feed to you.'
        }
      />
      {(featureLoading || gridLoading) && (
        <p role="status" className="sr-only">
          Finding films…
        </p>
      )}
      {!usePicks && popular.isError && (
        <EmptyState>Discover is unavailable right now. Try again in a moment.</EmptyState>
      )}
      {!loading && !feature && !(!usePicks && popular.isError) && (
        <EmptyState>
          No films left in your feed. Films you dislike stay on the Disliked list in My Lists.
        </EmptyState>
      )}
      {featureLoading ? <FeatureSkeleton /> : feature && <FeatureCard item={feature} />}
      {(gridLoading || rest.length > 0) && (
        <section aria-labelledby="deeper" className="mt-6">
          <h2 id="deeper" className="text-lg font-semibold">
            Go a little deeper
          </h2>
          <p className="mb-2.5 text-sm text-fg-muted">Picked from beyond the obvious</p>
          {/* 16 tiles fill 2- and 4-column rows; the 16th hides at 5 columns (lg). */}
          {gridLoading ? (
            <PosterGridSkeleton />
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5">
              {rest.slice(0, 16).map((item, i) => (
                <li key={item.movie.id} className={i === 15 ? 'flex lg:hidden' : 'flex'}>
                  <PosterCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {/* The weights lab is a dev-server tool, so the link only shows there (FEATURES.labs). */}
      {usePicks && FEATURES.labs && (
        <p className="mt-6 text-sm text-fg-muted">
          Curious how these are ranked?{' '}
          <Link to="/lab/weights" className="text-info underline">
            Tune the weights
          </Link>
        </p>
      )}
    </>
  )
}

/** Size-matched placeholder for the featured card while its film list loads. */
function FeatureSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-loading-section="featured"
      className="relative aspect-4/5 w-full animate-pulse overflow-hidden rounded-card border border-card-border bg-card-bg md:aspect-auto md:h-110"
    >
      <div className="absolute right-5 bottom-5.5 left-5 space-y-3">
        <div className="h-3 w-2/5 rounded-subtle bg-surface-selected" />
        <div className="h-10 w-3/4 rounded-subtle bg-surface-selected" />
        <div className="h-4 w-1/2 rounded-subtle bg-surface-selected" />
        <div className="h-4 w-2/3 rounded-subtle bg-surface-selected" />
      </div>
    </div>
  )
}

/** Sixteen stable VHS-tile placeholders; the last follows the real grid's lg visibility rule. */
function PosterGridSkeleton() {
  return (
    <ul
      aria-hidden="true"
      data-loading-section="grid"
      className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5"
    >
      {Array.from({ length: 16 }, (_, i) => (
        <li key={i} className={i === 15 ? 'flex lg:hidden' : 'flex'}>
          <div className="flex min-w-0 flex-1 animate-pulse flex-col">
            <div className="aspect-[0.547] w-full rounded-subtle border border-card-border bg-card-bg" />
            <div className="mt-3 min-h-36 space-y-2 rounded-control">
              <div className="h-4 w-4/5 rounded-subtle bg-surface-selected" />
              <div className="h-4 w-3/5 rounded-subtle bg-surface-selected" />
              <div className="h-3 w-1/2 rounded-subtle bg-surface-selected" />
              <div className="h-3 w-2/3 rounded-subtle bg-surface-selected" />
              <div className="h-3 w-3/4 rounded-subtle bg-surface-selected" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A film in the feed, with its match and reasons when it came from the scorer. */
interface Item {
  movie: MovieSummary
  match?: number
  because?: string[]
  /** Director and writer names, once the film's details have loaded. */
  credits?: Credits
}

/** "Because you liked Alien and The Thing" */
function Because({ titles }: { titles: string[] | undefined }) {
  if (!titles?.length) return null
  return (
    <span className="mt-1 block text-sm text-fg-muted">
      Because you liked <cite className="text-fg not-italic">{titles.join(' and ')}</cite>
    </span>
  )
}

/**
 * "Director: John Carpenter" and "Writer: Bill Lancaster" (plural with two names). A line is
 * left out when TMDB has no such credit, and both are left out until the details load.
 */
function CreditLines({ credits }: { credits: Credits | undefined }) {
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

// The large card at the top: the film's image with its title, match and reasons over a fade.
function FeatureCard({ item }: { item: Item }) {
  const { movie } = item
  const poster = imageUrl(movie.poster_path, 'w780')
  const backdrop = imageUrl(movie.backdrop_path, 'w1280')
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)
  return (
    <Link
      to={`/movie/${movie.id}`}
      style={genreTone(movie.genre_ids)}
      className="relative block aspect-4/5 w-full overflow-hidden rounded-card border border-(--tone) bg-card-bg shadow-card md:aspect-auto md:h-110"
    >
      {(poster || backdrop) && (
        <picture>
          {/* Tall poster on phones; the wide backdrop from md, where the card is landscape. */}
          {backdrop && <source media="(min-width: 768px)" srcSet={backdrop} />}
          <img
            src={poster ?? backdrop ?? undefined}
            srcSet={
              movie.poster_path
                ? `${imageUrl(movie.poster_path, 'w342')} 342w, ${imageUrl(movie.poster_path, 'w500')} 500w, ${poster} 780w`
                : undefined
            }
            sizes="(min-width: 768px) 0px, calc(100vw - 2.5rem)"
            fetchPriority="high"
            alt=""
            className="size-full object-cover"
          />
        </picture>
      )}
      {/* Fades the image into the page color so the text on top stays readable. */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent from-35% via-surface/40 via-60% to-surface" />
      {/* The VHS genre sticker, above the fade so it isn't dimmed. */}
      <GenreSticker
        genreIds={movie.genre_ids}
        seed={movie.id}
        size="lg"
        className="absolute top-3.5 right-3.5"
      />
      <div className="absolute right-5 bottom-5.5 left-5">
        <p className="mb-1 text-sm tracking-widest text-fg-muted uppercase">
          {item.match !== undefined && (
            <span className="mr-2 font-bold tracking-normal text-accent normal-case">
              {item.match}% match ·
            </span>
          )}
          Today’s featured deep cut
        </p>
        <h2 className="mb-2 font-display text-4xl leading-none text-balance md:text-5xl">
          {movie.title}
        </h2>
        <span className="block text-sm text-fg-muted">{meta.join(' · ')}</span>
        <Because titles={item.because} />
        <CreditLines credits={item.credits} />
        <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-info">
          <Icon name="eye" className="size-4" /> View details
        </span>
      </div>
    </Link>
  )
}

// One tile in the grid: the film as a VHS box (VhsBox, design approved 2026-10-09), then its
// title, year · genre, match, the first reason, director and writer.
function PosterCard({ item }: { item: Item }) {
  const { movie } = item
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)
  return (
    <Link
      to={`/movie/${movie.id}`}
      style={genreTone(movie.genre_ids)}
      // The box follows the mouse over this link and turns when it has keyboard focus.
      data-vhs-target=""
      // Keyboard focus shows on the text block below the box, not around the whole tile, where
      // the ring would box in the turning 3D box (owner's call, 2026-10-09). While the mouse
      // turns the box, the VHS box styles raise the tile above its neighbours.
      className="group relative flex min-w-0 flex-1 flex-col rounded-control focus-visible:shadow-none focus-visible:outline-none"
    >
      <VhsBox movie={movie} />
      {/* The focus ring: the app's usual ring (3px focus color, 3px gap), drawn around the text
          while the link has keyboard focus. It's the whole visible indicator, so it must never
          be clipped or covered (WCAG 2.4.7, 2.4.11; ADR-0009). */}
      <div className="mt-3 flex flex-1 flex-col rounded-control group-focus-visible:outline-3 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus">
        {/* Two lines at most, then an ellipsis. The clamp is visual only: the full title stays
            in the page, so it's still the link's accessible name, and `title` shows it on hover. */}
        <h3
          title={movie.title}
          className="mb-1 line-clamp-2 min-h-10 text-sm leading-snug font-semibold"
        >
          {movie.title}
        </h3>
        <p className="min-h-5 text-sm text-fg-muted">{meta.join(' · ')}</p>
        {item.match !== undefined && (
          <p className="text-sm font-bold text-accent">{item.match}% match</p>
        )}
        <Because titles={item.because?.slice(0, 1)} />
        <CreditLines credits={item.credits} />
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2.5 text-sm font-semibold text-info">
          <Icon name="eye" className="size-4" /> View details
        </span>
      </div>
    </Link>
  )
}
