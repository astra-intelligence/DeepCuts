// Home (/), signed in: the app's three ideas as three matching panels (ADR-0033, ADR-0035).
//
// Top Ten (a preview until that project ships), Movies I want to watch (the first four of the
// watchlist), and Discovery (four picks). The panels are the same ones the signed-out landing page
// uses to explain the app, stacked on phones and in three columns from `lg`. Films are VHS
// cassette tiles, two across in every panel (owner, 2026-10-11), like My Lists. With likes, the
// picks come from the recommendation scorer (ADR-0026) and show a "% match" and why. Without
// likes, they are popular films (minus disliked ones), with a hint to like a few films. Every tile
// names the film's director and writer, from its details (the same cached call Detail makes).
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { movieQueries } from '../api/queries'
import { creditsOf, summaryOf } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { CassetteCard, type CassetteItem } from '../components/CassetteCard'
import { FeaturePanel } from '../components/FeaturePanel'
import { PanelArt } from '../components/PanelArt'
import { PANELS } from '../components/panels'
import { PageHeading } from '../components/PageHeading'
import { useTagQueries } from '../session/tagQueries'
import { useRecommendations } from '../session/useRecommendations'

// How many recommendations Home shows: two rows of two cassettes. Six made Discovery about twice
// as tall as the other panels.
const PICKS = 4
// How many watchlist films Home previews (two full rows); My Lists has them all.
const WATCHLIST_PREVIEW = 4

// Two cassettes across in every panel, at every width: about 150px wide on a phone, 130px at
// 1024px and 170px at 1280px. VhsBox sizes itself from its tile's width.
const CASSETTE_GRID = 'grid grid-cols-2 gap-x-4 gap-y-5.5'

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
        <ul className={CASSETTE_GRID}>
          {movies.map((movie) => (
            <li key={movie.id} className="flex">
              <CassetteCard item={{ movie: summaryOf(movie), credits: creditsOf(movie) }} />
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
 * Four picks: enough to browse without becoming a second, endless destination on Home. (The big
 * featured card is gone, owner 2026-10-09: the top pick is simply the first cassette.)
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
  const shown: CassetteItem[] = (
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
  // Director and writer for each tile: one details call per film, cached for a day and shared
  // with Detail (and with the scorer's re-rank, so most picks are already loaded). A tile shows
  // its film at once, and its credit lines fill in when the details arrive.
  const details = useQueries({ queries: shown.map((i) => movieQueries.detail(i.movie.id)) })
  const picks = shown.map((item, i) => {
    const data = details[i]?.data
    return data ? { ...item, credits: creditsOf(data) } : item
  })
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
          <CassettesSkeleton />
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
        <ul className={CASSETTE_GRID}>
          {picks.map((pick) => (
            <li key={pick.movie.id} className="flex">
              <CassetteCard item={pick} />
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

/** Stable cassette-sized placeholders for the picks, so the panel doesn't jump when they load. */
function CassettesSkeleton() {
  return (
    <ul aria-hidden="true" data-loading-section="grid" className={CASSETTE_GRID}>
      {Array.from({ length: PICKS }, (_, i) => (
        <li key={i} className="flex">
          <div className="flex min-w-0 flex-1 animate-pulse flex-col">
            {/* The VHS box's own aspect ratio (VhsBox.css, --vhs-aspect). */}
            <div className="aspect-[0.547] w-full rounded-subtle border border-card-border bg-card-bg" />
            <div className="mt-3 min-h-36 space-y-2 rounded-control">
              <div className="h-4 w-4/5 rounded-subtle bg-surface-selected" />
              <div className="h-4 w-3/5 rounded-subtle bg-surface-selected" />
              <div className="h-3 w-1/2 rounded-subtle bg-surface-selected" />
              <div className="h-3 w-2/3 rounded-subtle bg-surface-selected" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
