// One film as a cassette tile: the VHS box (design approved 2026-10-09) with its badge, then the
// caption (ADR-0040 §8): title, the first reason, year · genre, director and writer. The whole
// tile is the link (no separate "View details", owner 2026-10-13); its title lights up on hover.
// Used by Home's shelves and My Lists.
import { Link } from 'react-router'
import { releaseYear, type Credits, type MovieSummary } from '../api/tmdb'
import { genreTone, primaryGenreName } from '../domain/genres'
import { Because, CreditLines } from './FilmCredits'
import { quickAction, type QuickAction } from './quickActions'
import { VhsBox, type VhsBadge } from './VhsBox'

/** A film on a cassette tile, with its match and reasons when it came from the scorer. */
export interface CassetteItem {
  movie: MovieSummary
  match?: number
  because?: string[]
  /** Director and writer names, once the film's details have loaded. */
  credits?: Credits
  /** Its place in a ranked list (the Top Ten, ADR-0036), shown as a "#1" tab on the box. */
  rank?: number
  /** Show the ADMIT ONE ticket: the film is on the watchlist (Home's watchlist shelf). */
  ticket?: boolean
  /** A Discovery quick action just done on it (issue #76): stamped over the box until Undo. */
  stamp?: QuickAction['tag']
}

/**
 * The box's badge for an item: a quick action's stamp, its rank, its match, or the watchlist
 * ticket, in that order.
 */
function badgeOf(item: CassetteItem): VhsBadge | undefined {
  if (item.stamp) return { kind: 'stamp', tag: item.stamp, label: quickAction(item.stamp).stamp }
  if (item.rank !== undefined) return { kind: 'rank', rank: item.rank }
  if (item.match !== undefined) return { kind: 'match', match: item.match }
  if (item.ticket) return { kind: 'ticket' }
  return undefined
}

/** A linked cassette tile that fills its container's width (put it in a `flex` grid cell). */
export function CassetteCard({ item }: { item: CassetteItem }) {
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
      className="group relative flex min-w-0 flex-1 flex-col focus-visible:shadow-none focus-visible:outline-none"
    >
      <VhsBox movie={movie} badge={badgeOf(item)} />
      {/* The focus ring: the app's usual ring (3px focus color, 3px gap), drawn around the text
          while the link has keyboard focus. It's the whole visible indicator, so it must never
          be clipped or covered (WCAG 2.4.7, 2.4.11; ADR-0009). */}
      <div className="mt-4 flex flex-1 flex-col group-focus-visible:outline-3 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus">
        {/* The box and its badge are hidden from screen readers, so the rank comes first here,
            and the link's accessible name starts "#1 The Thing". */}
        {item.rank !== undefined && <span className="sr-only">#{item.rank} </span>}
        {/* Two lines at most, then an ellipsis. The clamp is visual only: the full title stays
            in the page, so it's still the link's accessible name, and `title` shows it on hover. */}
        <h3
          title={movie.title}
          className="line-clamp-2 min-h-14 text-lg font-bold underline-offset-4 group-hover:text-accent group-hover:underline"
        >
          {movie.title}
        </h3>
        {item.match !== undefined && <span className="sr-only">{item.match}% match</span>}
        {/* The stamp is on the hidden box, so say it here too: "On your watchlist." */}
        {item.stamp && <span className="sr-only">{quickAction(item.stamp).stamp}.</span>}
        <Because titles={item.because?.slice(0, 1)} />
        <p className="mt-1 min-h-5 text-sm text-fg-muted">{meta.join(' · ')}</p>
        <CreditLines credits={item.credits} />
      </div>
    </Link>
  )
}
