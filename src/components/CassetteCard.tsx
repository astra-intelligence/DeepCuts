// One film as a cassette tile: the VHS box (design approved 2026-10-09), then its title,
// year · genre, match, the first reason, director and writer. Used by Home's Top Ten, watchlist
// and Discovery panels at every width (two across, ADR-0035) and, from `md` up, by My Lists.
import { Link } from 'react-router'
import { releaseYear, type Credits, type MovieSummary } from '../api/tmdb'
import { genreTone, primaryGenreName } from '../domain/genres'
import { Because, CreditLines } from './FilmCredits'
import { Icon } from './Icon'
import { VhsBox } from './VhsBox'

/** A film on a cassette tile, with its match and reasons when it came from the scorer. */
export interface CassetteItem {
  movie: MovieSummary
  match?: number
  because?: string[]
  /** Director and writer names, once the film's details have loaded. */
  credits?: Credits
  /** Its place in a ranked list (the Top Ten, ADR-0036), shown as "#1" above the title. */
  rank?: number
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
      className="group relative flex min-w-0 flex-1 flex-col rounded-control focus-visible:shadow-none focus-visible:outline-none"
    >
      <VhsBox movie={movie} />
      {/* The focus ring: the app's usual ring (3px focus color, 3px gap), drawn around the text
          while the link has keyboard focus. It's the whole visible indicator, so it must never
          be clipped or covered (WCAG 2.4.7, 2.4.11; ADR-0009). */}
      <div className="mt-3 flex flex-1 flex-col rounded-control group-focus-visible:outline-3 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus">
        {/* The rank comes first, so the link's accessible name starts "#1 The Thing". Gold, the
            Top Ten's color (ADR-0035), and always written out, never color alone. */}
        {item.rank !== undefined && (
          <p className="mb-0.5 font-brand text-sm font-extrabold text-favourite">#{item.rank}</p>
        )}
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
