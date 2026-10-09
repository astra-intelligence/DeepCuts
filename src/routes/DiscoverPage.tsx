// Home (/): a concise personal movie shelf with a watchlist preview and recommendations.
//
// Top Ten, then the watchlist, then a featured film and six more as cassettes. With likes, the picks come from the
// recommendation scorer (ADR-0026) and show a "% match" and why. Without likes, it shows popular
// films (minus disliked ones) and suggests liking a few films. Every card names the film's
// director and writer, from its details (the same cached call the Detail page makes).
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { movieQueries } from '../api/queries'
import { creditsOf, imageUrl, releaseYear, summaryOf } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { CassetteCard, type CassetteItem } from '../components/CassetteCard'
import { EmptyState } from '../components/EmptyState'
import { Eyebrow } from '../components/Eyebrow'
import { Because, CreditLines } from '../components/FilmCredits'
import { GenreSticker } from '../components/GenreSticker'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { MovieLink } from '../components/MovieLink'
import { genreTone, primaryGenreName } from '../domain/genres'
import { MD_UP, useMediaQuery } from '../hooks/useMediaQuery'
import { useTagQueries } from '../session/tagQueries'
import { useRecommendations } from '../session/useRecommendations'

/**
 * Home puts personal value before browsing (ADR-0033). Its compact recommendation section uses
 * the existing scorer (ADR-0026); without likes it uses popular films minus dislikes.
 */
export function HomePage() {
  // Seven = one feature plus six visual follow-on picks: enough to browse without becoming a
  // second, endless destination on the new Home page.
  const tuned = useRecommendations(7)
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
  const shown = items.slice(0, 7)
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
      <title>Home · Deep Cuts</title>
      {/* No eyebrow: Home's section labels use that style, so one at the top is clutter. */}
      <PageHeading
        title="Your movies, close at hand"
        lede="The films you love, want to see, and a few worth going deeper for."
      />
      <TopTenPreview />
      <WatchlistPreview />
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
          No films left in your picks. Films you dislike stay on the Disliked list in My Lists.
        </EmptyState>
      )}
      {featureLoading ? <FeatureSkeleton /> : feature && <FeatureCard item={feature} />}
      {(gridLoading || rest.length > 0) && (
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
          {gridLoading ? (
            <PosterGridSkeleton />
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5">
              {rest.slice(0, 6).map((item) => (
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

/** Six stable VHS-tile placeholders for Home's deliberately compact recommendation section. */
function PosterGridSkeleton() {
  return (
    <ul
      aria-hidden="true"
      data-loading-section="grid"
      className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-5"
    >
      {Array.from({ length: 6 }, (_, i) => (
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

// The large card at the top: the film's image with its title, match and reasons over a fade.
function FeatureCard({ item }: { item: CassetteItem }) {
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
