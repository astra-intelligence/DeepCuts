import { useQuery } from '@tanstack/react-query'
import { ToggleButton } from 'react-aria-components'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { Icon } from '../components/Icon'
import { PageHeading } from '../components/PageHeading'
import { genreTone, primaryGenreName } from '../domain/genres'
import { useSetTag, useTagQueries } from '../session/tagQueries'

// ?q= is untrusted input: trimmed and capped before use (ADR-0014). The header search writes it.
const searchParamsSchema = z.object({ q: z.string().max(100).catch('').default('') })

export function SearchPage() {
  const [params] = useSearchParams()
  const query = searchParamsSchema.parse(Object.fromEntries(params)).q.trim()
  const { data, isFetching, isError } = useQuery(movieQueries.search(query))
  const results = query.length >= 2 ? data?.results : undefined

  return (
    <>
      <title>Search · Deep Cuts</title>
      <PageHeading
        eyebrow={query ? 'Search results' : 'Quick add'}
        title={query ? `Results for “${query}”` : 'Find your next film'}
        lede="Open a film for details, or add it straight to Want to see."
      />
      <p role="status" className="mb-3 text-sm text-fg-muted">
        {isError
          ? 'Search is unavailable right now. Try again in a moment.'
          : isFetching
            ? 'Searching…'
            : results
              ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
              : 'Use the search above to find a film.'}
      </p>
      {results && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((movie) => (
            <ResultRow key={movie.id} movie={movie} />
          ))}
        </ul>
      )}
      {results?.length === 0 && <EmptyState>No matching films found.</EmptyState>}
    </>
  )
}

function ResultRow({ movie }: { movie: MovieSummary }) {
  const queries = useTagQueries()
  const tags = useQuery(queries.forMovie(movie.id)).data
  const setTag = useSetTag()
  const wanted = tags?.has('watchlist') ?? false
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)

  return (
    <li
      style={genreTone(movie.genre_ids)}
      className="grid min-w-0 gap-2.5 rounded-lg border border-border bg-surface-raised p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4 md:p-4"
    >
      <MovieLink movie={movie} meta={meta} disliked={tags?.has('disliked') ?? false} />
      <ToggleButton
        isSelected={wanted}
        onChange={(on) => setTag.mutate({ tmdbId: movie.id, tag: 'watchlist', on })}
        aria-label={`Want to see ${movie.title}`}
        className="inline-flex h-11 w-36 shrink-0 items-center justify-center gap-2 justify-self-end rounded-md border border-border-control bg-surface-overlay px-3.5 text-sm font-semibold whitespace-nowrap text-fg hover:border-info data-selected:border-info data-selected:bg-info data-selected:text-on-accent"
      >
        <Icon name={wanted ? 'check' : 'bookmark'} />
        {wanted ? 'Added' : 'Add to list'}
      </ToggleButton>
    </li>
  )
}

/** Poster + text link shared by Search and My Lists rows. */
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
      className="grid min-h-26 min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-3.5 rounded-md md:grid-cols-[4.75rem_minmax(0,1fr)] md:gap-4.5"
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="h-24 w-16 rounded-md border-b-3 border-(--tone) object-cover md:h-26 md:w-19"
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-24 w-16 rounded-md border-b-3 border-(--tone) bg-surface-overlay md:h-26 md:w-19"
        />
      )}
      <span className="flex min-w-0 flex-col gap-1.5">
        <strong className="font-semibold [overflow-wrap:anywhere]">{movie.title}</strong>
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

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-5 rounded-lg border border-border bg-surface-raised p-5 text-sm leading-relaxed text-fg-muted shadow-sm">
      {children}
    </p>
  )
}
