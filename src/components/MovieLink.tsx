// One film as a row in a list: poster, title, year/genre, a short overview and "View details".
import { Link } from 'react-router'
import { imageUrl, type MovieSummary } from '../api/tmdb'
import { Icon } from './Icon'

/**
 * Poster + text link for list rows (Search, My Lists). Expects `--tone` from `genreTone()` on a
 * parent, for the colored line under the poster.
 * @param meta - Short facts shown under the title, e.g. `['1982', 'Horror']`.
 * @param disliked - Adds a "Disliked" marker (disliked films stay findable in Search, design E4).
 */
export function MovieLink({
  movie,
  meta,
  disliked = false,
}: {
  movie: Pick<MovieSummary, 'id' | 'title' | 'overview' | 'poster_path'>
  meta: string[]
  disliked?: boolean
}) {
  const poster = imageUrl(movie.poster_path, 'w185')
  return (
    <Link
      to={`/movie/${movie.id}`}
      className="grid min-h-26 min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3.5 rounded-control md:grid-cols-[4.75rem_minmax(0,1fr)] md:gap-4.5"
    >
      {/* The poster is decorative (alt=""): the title right next to it names the link. A film
          without a poster gets an empty placeholder of the same size. */}
      {poster ? (
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="h-24 w-16 rounded-poster border-b-3 border-(--tone) object-cover md:h-26 md:w-19"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-24 w-16 rounded-poster border-b-3 border-(--tone) bg-poster-placeholder md:h-26 md:w-19"
        />
      )}
      <span className="flex min-w-0 flex-col gap-1.5">
        <strong className="font-semibold wrap-anywhere">{movie.title}</strong>
        <small className="text-sm text-fg-muted">
          {meta.join(' · ')}
          {disliked && <span className="ml-2 text-tag-disliked">Disliked</span>}
        </small>
        {movie.overview && (
          <span className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
            {movie.overview}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-sm font-semibold text-info">
          <Icon name="eye" className="size-4" /> View details
        </span>
      </span>
    </Link>
  )
}
