import { useQuery } from '@tanstack/react-query'
import { ToggleButton } from 'react-aria-components'
import { useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { releaseYear, type MovieSummary } from '../api/tmdb'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { MovieLink } from '../components/MovieLink'
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
      className="grid min-w-0 gap-2.5 rounded-card border border-card-border bg-card-bg p-3 shadow-card md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4 md:p-4"
    >
      <MovieLink movie={movie} meta={meta} disliked={tags?.has('disliked') ?? false} />
      <ToggleButton
        isSelected={wanted}
        onChange={(on) => setTag.mutate({ tmdbId: movie.id, tag: 'watchlist', on })}
        aria-label={`Want to see ${movie.title}`}
        className="inline-flex h-11 w-36 shrink-0 items-center justify-center gap-2 justify-self-end rounded-button border border-button-secondary-border bg-button-secondary-bg px-3.5 text-sm font-semibold whitespace-nowrap text-button-secondary-fg hover:border-info data-selected:border-info data-selected:bg-info data-selected:text-fg-on-accent"
      >
        <Icon name={wanted ? 'check' : 'bookmark'} />
        {wanted ? 'Added' : 'Add to list'}
      </ToggleButton>
    </li>
  )
}
