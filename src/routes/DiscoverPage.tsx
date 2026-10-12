// Home (/), signed in: the app's three ideas as three matching panels (ADR-0033, ADR-0035).
//
// Top Ten (a preview until that project ships), Movies I want to watch (the first three of the
// watchlist), and Discovery (six picks). The panels are the same ones the signed-out landing page
// uses to explain the app, stacked on phones and in three columns from `lg`. With likes, the picks
// come from the recommendation scorer (ADR-0026) and show a "% match" and why. Without likes, they
// are popular films (minus disliked ones), with a hint to like a few films.
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { movieQueries } from '../api/queries'
import { summaryOf, type MovieSummary } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { FeaturePanel } from '../components/FeaturePanel'
import { FilmRow } from '../components/FilmRow'
import { PanelArt } from '../components/PanelArt'
import { PANELS } from '../components/panels'
import { PageHeading } from '../components/PageHeading'
import { useTagQueries } from '../session/tagQueries'
import { useRecommendations } from '../session/useRecommendations'

// How many recommendations Home shows.
const PICKS = 6
// How many watchlist films Home previews; My Lists has them all.
const WATCHLIST_PREVIEW = 3

/** A film in the Discovery panel, with its match and reasons when it came from the scorer. */
interface Pick {
  movie: MovieSummary
  match?: number
  because?: string[]
}

/**
 * Home puts personal value before browsing (ADR-0033) in three panels that line up with the
 * landing page's (ADR-0035): one column on phones, three equal columns from `lg`.
 */
export function HomePage() {
  return (
    <>
      <title>Home · Deep Cuts</title>
      {/* No eyebrow: it would repeat the panels' own headings. */}
      <PageHeading
        title="Your movies, close at hand"
        lede="The films you love, want to see, and a few worth going deeper for."
      />
      {/* `items-stretch` (the grid default) plus FeaturePanel's `h-full` keeps a row's panels
          the same height. */}
      <ul className="grid gap-4 lg:grid-cols-3">
        <li>
          <TopTenPanel />
        </li>
        <li>
          <WatchlistPanel />
        </li>
        <li>
          <DiscoveryPanel />
        </li>
      </ul>
    </>
  )
}

/** The visible home for the future curated list, without pretending liked films are a Top Ten. */
function TopTenPanel() {
  return (
    <FeaturePanel panel={PANELS['top-ten']}>
      {/* The landing page's illustration, quieter: this is what's coming, not content yet. */}
      <div className="grid place-items-center rounded-container bg-surface-raised px-4 py-5 opacity-60">
        <PanelArt id="top-ten" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        Your all-time favourites, in your order. Building and sharing this list is coming next.
      </p>
    </FeaturePanel>
  )
}

/** The first few films on the watchlist, with My Lists as the full destination. */
function WatchlistPanel() {
  const ids = useQuery(useTagQueries().list('watchlist')).data ?? []
  const movies = useQueries({
    queries: ids.slice(0, WATCHLIST_PREVIEW).map((id) => movieQueries.detail(id)),
  })
    .map((query) => query.data)
    .filter((movie): movie is NonNullable<typeof movie> => movie !== undefined)

  return (
    <FeaturePanel
      panel={PANELS.watchlist}
      action={{ to: '/lists?tag=watchlist', label: 'See all' }}
    >
      {movies.length > 0 ? (
        <ul className="divide-y divide-card-border">
          {movies.map((movie) => (
            <li key={movie.id} className="py-2 first:pt-0 last:pb-0">
              <FilmRow movie={summaryOf(movie)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-fg-muted">
          Save a film from search or its details, and it will be waiting here.
        </p>
      )}
    </FeaturePanel>
  )
}

/**
 * Six picks: enough to browse without becoming a second, endless destination on Home. (The big
 * featured card is gone, owner 2026-10-09: the top pick is simply the first row.)
 */
function DiscoveryPanel() {
  const tuned = useRecommendations(PICKS)
  const popular = useQuery(movieQueries.discover())
  const excluded = useQuery(useTagQueries().feedExclusions()).data

  // Use the scorer's picks when there are likes and the scorer has (or is still finding) picks;
  // otherwise fall back to popular films so the panel is never empty.
  const usePicks = tuned.hasLikes && (tuned.loading || tuned.recommendations.length > 0)
  // While the scorer is still loading (both passes, ADR-0028), show nothing rather than early
  // picks that would reshuffle when the re-rank arrives.
  const picks: Pick[] = (
    usePicks
      ? (tuned.loading ? [] : tuned.recommendations).map((r) => ({
          movie: r.movie,
          match: r.match,
          because: r.because,
        }))
      : (popular.data?.results ?? [])
          .filter((m) => !excluded?.has(m.id))
          .map((movie) => ({ movie }))
  ).slice(0, PICKS)
  const loading = usePicks ? tuned.loading : popular.isPending
  const failed = !usePicks && popular.isError

  return (
    <FeaturePanel panel={PANELS.discovery}>
      {/* Only the untuned feed explains itself: it's the one line that tells you what to do. */}
      {!usePicks && !failed && (
        <p className="mb-3 text-sm text-fg-muted">Like a few films to tune these picks to you.</p>
      )}
      {loading ? (
        <>
          <p role="status" className="sr-only">
            Finding films…
          </p>
          <RowsSkeleton />
        </>
      ) : failed ? (
        <p className="text-sm text-fg-muted">
          Discovery is unavailable right now. Try again in a moment.
        </p>
      ) : picks.length === 0 ? (
        <p className="text-sm text-fg-muted">
          No films left in your picks. Films you dislike stay on the Disliked list in My Lists.
        </p>
      ) : (
        <ul className="divide-y divide-card-border">
          {picks.map((pick) => (
            <li key={pick.movie.id} className="py-2 first:pt-0 last:pb-0">
              <FilmRow movie={pick.movie} match={pick.match} because={pick.because} />
            </li>
          ))}
        </ul>
      )}
      {/* The weights lab is a dev-server tool, so the link only shows there (FEATURES.labs). */}
      {usePicks && FEATURES.labs && (
        <p className="mt-auto pt-4 text-sm text-fg-muted">
          Curious how these are ranked?{' '}
          <Link to="/lab/weights" className="text-info underline">
            Tune the weights
          </Link>
        </p>
      )}
    </FeaturePanel>
  )
}

/** Stable placeholders the size of the six pick rows, so the panel doesn't jump when they load. */
function RowsSkeleton() {
  return (
    <ul aria-hidden="true" data-loading-section="rows" className="divide-y divide-card-border">
      {Array.from({ length: PICKS }, (_, i) => (
        <li key={i} className="py-2 first:pt-0 last:pb-0">
          <div className="grid min-h-18 animate-pulse grid-cols-[3rem_minmax(0,1fr)] items-center gap-3">
            <div className="h-18 w-12 rounded-poster bg-surface-selected" />
            <div className="space-y-2">
              <div className="h-4 w-4/5 rounded-subtle bg-surface-selected" />
              <div className="h-3 w-1/2 rounded-subtle bg-surface-selected" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
