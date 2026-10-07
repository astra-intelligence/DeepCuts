// TMDB reads through TanStack Query (ADR-0015): caching, de-duplication and cancellation.
//
// Each entry pairs a cache key with the call that fills it. Screens use them as
// `useQuery(movieQueries.detail(id))`; two screens asking for the same film share one request.
import { queryOptions } from '@tanstack/react-query'
import { tmdb } from './tmdb'

const HOUR = 60 * 60 * 1000

// Movie metadata rarely changes, so TMDB queries stay fresh for a long time (ADR-0015).
export const movieQueries = {
  /** Title search. Waits for at least two characters, so a single letter doesn't search. */
  search: (query: string) =>
    queryOptions({
      queryKey: ['tmdb', 'search', query],
      queryFn: ({ signal }) => tmdb.search(query, 1, signal),
      enabled: query.trim().length >= 2,
      staleTime: HOUR,
    }),
  /** Popular films (Discover without likes, and onboarding). */
  discover: () =>
    queryOptions({
      queryKey: ['tmdb', 'discover'],
      queryFn: ({ signal }) => tmdb.discover(signal),
      staleTime: HOUR,
    }),
  /** A film series' films, for the scorer's series candidates (ADR-0032). */
  collection: (id: number) =>
    queryOptions({
      queryKey: ['tmdb', 'collection', id],
      queryFn: ({ signal }) => tmdb.collection(id, signal),
      staleTime: 24 * HOUR,
    }),
  /** One film's details (also feeds the recommendation scorer, ADR-0026). */
  detail: (id: number) =>
    queryOptions({
      queryKey: ['tmdb', 'movie', id],
      queryFn: ({ signal }) => tmdb.movie(id, signal),
      staleTime: 24 * HOUR,
    }),
  /** Where to watch one film. */
  providers: (id: number) =>
    queryOptions({
      queryKey: ['tmdb', 'movie', id, 'providers'],
      queryFn: ({ signal }) => tmdb.watchProviders(id, signal),
      staleTime: 24 * HOUR,
    }),
}
