import { queryOptions } from '@tanstack/react-query'
import { tmdb } from './tmdb'

const HOUR = 60 * 60 * 1000

// Movie metadata rarely changes, so TMDB queries stay fresh for a long time (ADR-0015).
export const movieQueries = {
  search: (query: string) =>
    queryOptions({
      queryKey: ['tmdb', 'search', query],
      queryFn: ({ signal }) => tmdb.search(query, 1, signal),
      enabled: query.trim().length >= 2,
      staleTime: HOUR,
    }),
  discover: (genres: readonly number[] = []) =>
    queryOptions({
      queryKey: ['tmdb', 'discover', [...genres].sort((a, b) => a - b)],
      queryFn: ({ signal }) => tmdb.discover(genres, signal),
      staleTime: HOUR,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['tmdb', 'movie', id],
      queryFn: ({ signal }) => tmdb.movie(id, signal),
      staleTime: 24 * HOUR,
    }),
  providers: (id: number) =>
    queryOptions({
      queryKey: ['tmdb', 'movie', id, 'providers'],
      queryFn: ({ signal }) => tmdb.watchProviders(id, signal),
      staleTime: 24 * HOUR,
    }),
}
