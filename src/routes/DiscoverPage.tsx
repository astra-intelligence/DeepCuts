// Home (/), signed in: the app's three ideas as three full-width shelves, stacked in the order
// Top Ten, Movies I want to watch, Discovery (ADR-0033, ADR-0040 §6b).
//
// Each shelf is a row of VHS boxes that wraps as its list grows: the whole Top Ten (ADR-0036)
// with each box's rank on a tab and the next open slot, the latest watchlist films, and
// Discovery's picks. With likes, the picks come from the recommendation scorer (ADR-0026) with a
// match stamp and the reason why. Without likes, they are popular films (minus disliked ones),
// with a hint to like a few films. Every box names the film's director and writer, from its
// details (the same cached call Detail makes).
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { movieQueries } from '../api/queries'
import { creditsOf, summaryOf } from '../api/tmdb'
import { FEATURES } from '../config/features'
import { TOP_TEN_SIZE } from '../domain/topTen'
import { CassetteCard, type CassetteItem } from '../components/CassetteCard'
import { EmptySlot } from '../components/EmptySlot'
import { focusHeaderSearch } from '../components/headerSearch'
import { PageHeading } from '../components/PageHeading'
import { PANELS } from '../components/panels'
import { SHELF_GRID, ShelfSection } from '../components/ShelfSection'
import { Ticker } from '../components/Ticker'
import { useTagQueries } from '../session/tagQueries'
import { useTopTen } from '../session/topTenQueries'
import { HOME_PICKS, LIMITS, useRecommendations } from '../session/useRecommendations'

// How many watchlist films Home shows: the same most recent ones the scorer already loads, so
// the shelf costs no extra calls. My Lists has them all.
const WATCHLIST_PREVIEW = LIMITS.watchlist

/** Home: the headline, then the three shelves (ADR-0033, ADR-0040). */
export function HomePage() {
  // Discovery's picks are worked out once here and shared by the ticker and the shelf, so the
  // scorer runs once. The two lists are cached queries, so reading them twice costs nothing.
  const discovery = useDiscoveryPicks()
  const topTen = useTopTen().data ?? []
  const watchlist = useQuery(useTagQueries().list('watchlist')).data ?? []
  return (
    <>
      <title>Home · Deep Cuts</title>
      <Ticker items={tickerItems(topTen.length, watchlist.length, discovery)} />
      <PageHeading
        size="hero"
        title="Your movies,"
        highlight="close at hand"
        lede="The films you love, want to see, and a few worth going deeper for."
      />
      <TopTenShelf ids={topTen} />
      <WatchlistShelf ids={watchlist} />
      <DiscoveryShelf discovery={discovery} />
    </>
  )
}

/**
 * The person's Top Ten (ADR-0036), all of it, in their order: #1 first, then the next open slot
 * until all ten are ranked. Films are added and removed from their Detail page; reordering comes
 * with the Top Ten management screen.
 */
function TopTenShelf({ ids }: { ids: readonly number[] }) {
  // One details call per film (cached for a day and shared with Detail). Each box appears once
  // its film has loaded; the rank comes from the list, so it stays right even if one film is
  // slow or missing.
  const details = useQueries({ queries: ids.map((id) => movieQueries.detail(id)) })
  const films = ids.flatMap((_, i) => {
    const movie = details[i]?.data
    return movie ? [{ movie: summaryOf(movie), credits: creditsOf(movie), rank: i + 1 }] : []
  })

  return (
    <ShelfSection
      id="top-ten"
      feature={1}
      title={PANELS['top-ten'].title}
      meta={
        <p className="font-label text-sm text-fg-muted">
          {ids.length} of {TOP_TEN_SIZE} ranked
        </p>
      }
    >
      {/* An ordered list: the order is the meaning, and screen readers announce it. The open
          slot is the list's next place, so it's an item too. */}
      <ol className={SHELF_GRID}>
        {films.map((item) => (
          <li key={item.movie.id} className="flex">
            <CassetteCard item={item} />
          </li>
        ))}
        {ids.length < TOP_TEN_SIZE && (
          <li>
            <EmptySlot
              mark={`#${ids.length + 1}`}
              title="Add a film"
              note="Slot still open. Find a film, then add it from its page."
              onPress={focusHeaderSearch}
            />
          </li>
        )}
      </ol>
    </ShelfSection>
  )
}

/** The latest films on the watchlist, each with its ADMIT ONE ticket; My Lists has them all. */
function WatchlistShelf({ ids }: { ids: readonly number[] }) {
  const movies = useQueries({
    queries: ids.slice(0, WATCHLIST_PREVIEW).map((id) => movieQueries.detail(id)),
  })
    .map((query) => query.data)
    .filter((movie): movie is NonNullable<typeof movie> => movie !== undefined)

  return (
    <ShelfSection
      id="watchlist"
      feature={2}
      title={PANELS.watchlist.title}
      to="/lists?tag=watchlist"
    >
      <ul className={SHELF_GRID}>
        {ids.length > 0 ? (
          movies.map((movie) => (
            <li key={movie.id} className="flex">
              <CassetteCard
                item={{ movie: summaryOf(movie), credits: creditsOf(movie), ticket: true }}
              />
            </li>
          ))
        ) : (
          <li>
            <EmptySlot
              title="Nothing on the bill yet"
              note="Search for a film to save it"
              onPress={focusHeaderSearch}
            />
          </li>
        )}
      </ul>
    </ShelfSection>
  )
}

/**
 * The ticker's live facts (ADR-0040), most important first. An empty list drops its item rather
 * than showing a zero, and only scorer picks count as picks (the popular fallback isn't tuned).
 */
function tickerItems(topTen: number, watchlist: number, discovery: DiscoveryPicks): string[] {
  const tuned = discovery.usePicks && !discovery.loading ? discovery.picks : []
  const top = tuned[0]
  return [
    topTen > 0 && `Top Ten: ${topTen} of 10 ranked`,
    watchlist > 0 && `Watchlist: ${watchlist} ${watchlist === 1 ? 'film' : 'films'}`,
    tuned.length > 0 && `Discovery: ${tuned.length} new ${tuned.length === 1 ? 'pick' : 'picks'}`,
    top?.match !== undefined && `Top pick: ${top.movie.title}, ${top.match}% match`,
  ].filter((item): item is string => item !== false)
}

/** Discovery's picks and their state, from `useDiscoveryPicks`. */
type DiscoveryPicks = ReturnType<typeof useDiscoveryPicks>

/**
 * Discovery's picks (ADR-0026): the scorer's when there are likes, else popular films. (The big
 * featured card is gone, owner 2026-10-09: the top pick is simply the first box.)
 */
function useDiscoveryPicks() {
  const tuned = useRecommendations(HOME_PICKS)
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
  ).slice(0, HOME_PICKS)
  // Director and writer for each tile: one details call per film, cached for a day and shared
  // with Detail (and with the scorer's re-rank, so most picks are already loaded). A tile shows
  // its film at once, and its credit lines fill in when the details arrive.
  const details = useQueries({ queries: shown.map((i) => movieQueries.detail(i.movie.id)) })
  const picks = shown.map((item, i) => {
    const data = details[i]?.data
    return data ? { ...item, credits: creditsOf(data) } : item
  })
  return {
    picks,
    usePicks,
    loading: usePicks ? tuned.loading : popular.isPending,
    failed: !usePicks && popular.isError,
  }
}

/** The Discovery shelf: the picks, a loading placeholder, or what went wrong. */
function DiscoveryShelf({ discovery }: { discovery: DiscoveryPicks }) {
  const { picks, usePicks, loading, failed } = discovery
  return (
    <ShelfSection
      id="discovery"
      feature={3}
      title={PANELS.discovery.title}
      meta={<p className="font-label text-sm text-fg-muted">Deep cuts, picked for your taste</p>}
    >
      {/* Only the untuned feed explains itself: it's the one line that tells you what to do. */}
      {!usePicks && !failed && (
        <p className="-mt-2 mb-6 text-base text-fg-soft">
          Like a few films to tune these picks to you.
        </p>
      )}
      {loading ? (
        <>
          <p role="status" className="sr-only">
            Finding films…
          </p>
          <ShelfSkeleton />
        </>
      ) : failed ? (
        // The error chip (ADR-0040 §9): what failed and what to do.
        <p
          role="status"
          className="w-fit border-2 border-dashed border-danger px-4 py-3 font-label text-base text-fg"
        >
          Discovery is unavailable right now. Try again in a moment.
        </p>
      ) : picks.length === 0 ? (
        <ul className={SHELF_GRID}>
          <li>
            <EmptySlot
              title="Like a few films to get your first picks"
              note="Films you dislike stay on the Disliked list in My Lists."
            />
          </li>
        </ul>
      ) : (
        <ul className={SHELF_GRID}>
          {picks.map((pick) => (
            <li key={pick.movie.id} className="flex">
              <CassetteCard item={pick} />
            </li>
          ))}
        </ul>
      )}
      {/* The weights lab is a dev-server tool, so the link only shows there (FEATURES.labs). */}
      {usePicks && FEATURES.labs && (
        <p className="mt-6 text-sm text-fg-muted">
          Curious how these are ranked?{' '}
          <Link to="/lab/weights" className="text-accent underline">
            Tune the weights
          </Link>
        </p>
      )}
    </ShelfSection>
  )
}

/**
 * Box-shaped placeholders for the picks while they load (ADR-0040 §9): raised ink with a
 * halftone screen and room for the caption, so the shelf doesn't jump when the picks arrive.
 */
function ShelfSkeleton() {
  return (
    <ul aria-hidden="true" data-loading-section="grid" className={SHELF_GRID}>
      {Array.from({ length: HOME_PICKS }, (_, i) => (
        <li key={i} className="flex">
          <div className="flex min-w-0 flex-1 flex-col">
            {/* The VHS box's own aspect ratio (2:3, the poster's). */}
            <div className="aspect-2/3 w-full bg-surface-raised halftone" />
            <div className="mt-4 min-h-36 space-y-2">
              <div className="h-5 w-4/5 bg-surface-raised" />
              <div className="h-4 w-3/5 bg-surface-raised" />
              <div className="h-3 w-1/2 bg-surface-raised" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
