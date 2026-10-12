// Home (/): a concise personal movie shelf with a watchlist preview and recommendations.
//
// Top Ten, then the watchlist, then six picks as cassettes. With likes, the picks come from the
// recommendation scorer (ADR-0026) and show a "% match" and why. Without likes, it shows popular
// films (minus disliked ones) and suggests liking a few films. Every card names the film's
// director and writer, from its details (the same cached call the Detail page makes).
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { movieQueries } from '../api/queries'
import { creditsOf, releaseYear, summaryOf } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { CassetteCard, type CassetteItem } from '../components/CassetteCard'
import { EmptyState } from '../components/EmptyState'
import { Eyebrow } from '../components/Eyebrow'
import { PageHeading } from '../components/PageHeading'
import { MovieLink } from '../components/MovieLink'
import { genreTone, primaryGenreName } from '../domain/genres'
import { MD_UP, useMediaQuery } from '../hooks/useMediaQuery'
import { useTagQueries } from '../session/tagQueries'
import { useRecommendations } from '../session/useRecommendations'

// How many recommendations Home shows.
const PICKS = 6

/**
 * Home puts personal value before browsing (ADR-0033). Its compact recommendation section uses
 * the existing scorer (ADR-0026); without likes it uses popular films minus dislikes.
 */
export function HomePage() {
  // Six picks: enough to browse without becoming a second, endless destination on Home. (The big
  // featured card is gone, owner 2026-10-09: the top pick is simply the first cassette.)
  const tuned = useRecommendations(PICKS)
  const popular = useQuery(movieQueries.discover())
  const excluded = useQuery(useTagQueries().feedExclusions()).data

  // Use the scorer's picks when there are likes and the scorer has (or is still finding) picks;
  // otherwise fall back to popular films so the page is never empty.
  const usePicks = tuned.hasLikes && (tuned.loading || tuned.recommendations.length > 0)
  // While the scorer is still loading (both passes, ADR-0028), show nothing rather than early
  // picks that would reshuffle when the re-rank arrives.
  const items: CassetteItem[] = usePicks
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
  const shown = items.slice(0, PICKS)
  const details = useQueries({ queries: shown.map((i) => movieQueries.detail(i.movie.id)) })
  const picks = shown.map((item, i) => {
    const data = details[i]?.data
    return data ? { ...item, credits: creditsOf(data) } : item
  })
  // Skeletons cover only the request that determines which films belong in the list. Holding the
  // poster for secondary credits delays the page's largest paint; cards instead reserve the two
  // credit lines below and fill them independently when each detail request completes.

  return (
    <>
      <title>Home · Deep Cuts</title>
      {/* No eyebrow: Home's section labels use that style, so one at the top is clutter. */}
      <PageHeading
        title="Your movies, close at hand"
        lede="The films you love, want to see, and a few worth going deeper for."
      />
      <TopTenPreview />
      <WatchlistPreview />
      {loading && (
        <p role="status" className="sr-only">
          Finding films…
        </p>
      )}
      {!usePicks && popular.isError && (
        <EmptyState>Discover is unavailable right now. Try again in a moment.</EmptyState>
      )}
      {!loading && picks.length === 0 && !(!usePicks && popular.isError) && (
        <EmptyState>
          No films left in your picks. Films you dislike stay on the Disliked list in My Lists.
        </EmptyState>
      )}
      {(loading || picks.length > 0) && (
        <section aria-labelledby="deeper" className="mt-6">
          <Eyebrow as="h2" id="deeper" tone="contextual">
            Go a little deeper
          </Eyebrow>
          {/* Only the untuned feed explains itself: it's the one line that tells you what to do. */}
          {!usePicks && (
            <p className="mb-2.5 text-sm text-fg-muted">
              Like a few films to tune these picks to you.
            </p>
          )}
          {loading ? (
            <PosterGridSkeleton />
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5">
              {picks.map((item) => (
                <li key={item.movie.id} className="flex">
                  <CassetteCard item={item} />
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

/** The visible home for the future curated list, without pretending liked films are a Top Ten. */
function TopTenPreview() {
  return (
    <section
      aria-labelledby="top-ten"
      className="mt-6 rounded-card border border-card-border bg-card-bg p-4 shadow-card md:p-5"
    >
      <Eyebrow as="h2" id="top-ten" tone="contextual" className="">
        Top Ten
      </Eyebrow>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
        Your all-time favourites, in your order. Building and sharing this list is the next project.
      </p>
    </section>
  )
}

/**
 * A short, useful preview of the existing watchlist, with My Lists as the full destination.
 * Rows on phones; from `md`, cassettes in the same columns as the picks below, so every cassette
 * on the page is one size (owner, 2026-10-09: phones unchanged).
 */
function WatchlistPreview() {
  const mdUp = useMediaQuery(MD_UP)
  const queries = useTagQueries()
  const ids = useQuery(queries.list('watchlist')).data ?? []
  // Three rows keep Home scannable; My Lists remains the complete collection.
  const movies = useQueries({ queries: ids.slice(0, 3).map((id) => movieQueries.detail(id)) })
    .map((query) => query.data)
    .filter((movie): movie is NonNullable<typeof movie> => movie !== undefined)

  return (
    <section aria-labelledby="watchlist" className="mt-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <Eyebrow as="h2" id="watchlist" tone="contextual" className="">
          Movies I want to watch
        </Eyebrow>
        <Link
          to="/lists?tag=watchlist"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-info underline"
        >
          See all
        </Link>
      </div>
      {movies.length > 0 && mdUp ? (
        <ul className="mt-3 grid grid-cols-4 gap-x-4 gap-y-5.5 lg:grid-cols-5">
          {movies.map((movie) => (
            <li key={movie.id} className="flex">
              <CassetteCard item={{ movie: summaryOf(movie), credits: creditsOf(movie) }} />
            </li>
          ))}
        </ul>
      ) : movies.length > 0 ? (
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {movies.map((movie) => (
            <li
              key={movie.id}
              style={genreTone(movie.genres.map((genre) => genre.id))}
              className="rounded-card border border-card-border bg-card-bg p-3 shadow-card"
            >
              <MovieLink
                movie={movie}
                meta={[
                  releaseYear(movie.release_date),
                  primaryGenreName(movie.genres.map((g) => g.id)),
                ].filter(Boolean)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Save a film from search or its details, and it will be waiting here.
        </p>
      )}
    </section>
  )
}

/** Six stable VHS-tile placeholders for Home's deliberately compact recommendation section. */
function PosterGridSkeleton() {
  return (
    <ul
      aria-hidden="true"
      data-loading-section="grid"
      className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5"
    >
      {Array.from({ length: PICKS }, (_, i) => (
        <li key={i} className="flex">
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
