import { useQuery } from '@tanstack/react-query'
import { Input, Label, SearchField } from 'react-aria-components'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { movieQueries } from '../api/queries'
import { imageUrl, releaseYear } from '../api/tmdb'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

// ?q= is untrusted input: trimmed and capped before use (ADR-0014).
const searchParamsSchema = z.object({ q: z.string().max(100).catch('').default('') })

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const { q } = searchParamsSchema.parse(Object.fromEntries(params))
  const query = useDebouncedValue(q.trim(), 300)
  const { data, isFetching, isError } = useQuery(movieQueries.search(query))
  const results = query.length >= 2 ? data?.results : undefined

  return (
    <>
      <title>Search · Deep Cuts</title>
      <h1 className="font-display text-4xl">Search</h1>
      <SearchField
        value={q}
        onChange={(value) => setParams(value ? { q: value } : {}, { replace: true })}
        className="mt-4 flex max-w-2xl flex-col gap-2"
      >
        <Label className="text-sm text-fg-muted">Film title</Label>
        <Input
          placeholder="Try “The Thing”"
          className="border-border-control placeholder:text-fg-placeholder min-h-12 rounded-xl border bg-surface-raised px-4 text-fg focus:outline-2 focus:outline-focus"
        />
      </SearchField>

      <p role="status" className="mt-4 text-sm text-fg-muted">
        {isError
          ? 'Search is unavailable right now. Try again in a moment.'
          : isFetching
            ? 'Searching…'
            : results
              ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
              : ''}
      </p>

      {results && results.length > 0 && (
        <ul className="mt-2 grid gap-x-8 md:grid-cols-2">
          {results.map((movie) => {
            const poster = imageUrl(movie.poster_path, 'w92')
            return (
              <li key={movie.id} className="border-b border-border">
                <Link
                  to={`/movie/${movie.id}`}
                  className="flex min-h-20 items-center gap-4 py-2 hover:bg-surface-raised"
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      width={46}
                      height={69}
                      loading="lazy"
                      className="rounded-md object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="h-[69px] w-[46px] rounded-md bg-surface-overlay"
                    />
                  )}
                  <span className="flex flex-col">
                    <span className="font-semibold">{movie.title}</span>
                    <span className="text-sm text-fg-muted">
                      {releaseYear(movie.release_date) || 'Year unknown'}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
