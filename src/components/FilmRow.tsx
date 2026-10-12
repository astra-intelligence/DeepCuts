// One film as a compact row inside a Home panel (ADR-0035): a small poster, the title, year ·
// genre, and, for picks, the match and the first reason. Shorter than MovieLink (no overview), so
// six picks fit a ~300px column on desktop without the page growing very tall.
import { Link } from 'react-router'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { genreTone, primaryGenreName } from '../domain/genres'
import { Because } from './FilmCredits'

/**
 * A linked film row. The title names the link; the poster is decorative.
 * @param match - The scorer's "% match" (picks only).
 * @param because - Liked films this pick came from; the first one is shown (picks only).
 */
export function FilmRow({
  movie,
  match,
  because,
}: {
  movie: Pick<MovieSummary, 'id' | 'title' | 'poster_path' | 'release_date' | 'genre_ids'>
  match?: number | undefined
  because?: string[] | undefined
}) {
  const poster = imageUrl(movie.poster_path, 'w185')
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)
  return (
    <Link
      to={`/movie/${movie.id}`}
      // `--tone` (the film's genre color) draws the line under the poster, as on MovieLink.
      style={genreTone(movie.genre_ids)}
      className="grid min-h-18 min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 rounded-control"
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="h-18 w-12 rounded-poster border-b-3 border-(--tone) object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-18 w-12 rounded-poster border-b-3 border-(--tone) bg-poster-placeholder"
        />
      )}
      <span className="flex min-w-0 flex-col">
        {/* One line, then an ellipsis; `title` shows the full name on hover. */}
        <strong title={movie.title} className="truncate text-sm font-semibold">
          {movie.title}
        </strong>
        <small className="text-sm text-fg-muted">{meta.join(' · ')}</small>
        {match !== undefined && (
          <span className="text-sm font-bold text-accent">{match}% match</span>
        )}
        <Because titles={because?.slice(0, 1)} />
      </span>
    </Link>
  )
}
