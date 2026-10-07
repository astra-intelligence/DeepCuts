// Feeds the scorer (ADR-0026) from the person's tags and cached TMDB details. One details call per
// tagged film, with its recommendations appended, so Detail pages and Discover share the cache.
import { useQueries, useQuery } from '@tanstack/react-query'
import { movieQueries } from '../api/queries'
import { releaseYear, type MovieDetail, type MovieSummary } from '../api/tmdb'
import { recommend, type Pick, type ScorerFilm } from '../domain/scorer'
import { useTagQueries } from './tagQueries'

/** How many recent tags of each kind inform the feed (bounds the number of calls). */
const LIMITS = { liked: 20, watchlist: 10, disliked: 10 } as const

export interface Recommendation extends Omit<Pick, 'film'> {
  movie: MovieSummary
}

function toScorerFilm(m: MovieSummary | MovieDetail): ScorerFilm {
  return {
    id: m.id,
    title: m.title,
    genreIds: 'genre_ids' in m ? m.genre_ids : m.genres.map((g) => g.id),
    year: Number(releaseYear(m.release_date)) || null,
    language: m.original_language,
    popularity: m.popularity,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
  }
}

export function useRecommendations(limit = 20) {
  const tagQueries = useTagQueries()
  const liked = (useQuery(tagQueries.list('liked')).data ?? []).slice(0, LIMITS.liked)
  const wanted = (useQuery(tagQueries.list('watchlist')).data ?? []).slice(0, LIMITS.watchlist)
  const disliked = (useQuery(tagQueries.list('disliked')).data ?? []).slice(0, LIMITS.disliked)
  const tagged = useQuery(tagQueries.all()).data

  const ids = [...new Set([...liked, ...wanted, ...disliked])]
  const details = useQueries({ queries: ids.map((id) => movieQueries.detail(id)) })
  const byId = new Map<number, MovieDetail>()
  details.forEach((q, i) => {
    const id = ids[i]
    if (q.data && id !== undefined) byId.set(id, q.data)
  })
  const detailsOf = (list: number[]) => list.flatMap((id) => byId.get(id) ?? [])

  // Scoring a few hundred candidates is well under a millisecond, so it simply runs each render.
  const likedMovies = detailsOf(liked)
  const summaries = new Map(
    likedMovies.flatMap((m) => (m.recommendations?.results ?? []).map((r) => [r.id, r] as const)),
  )
  const picks = recommend(
    {
      liked: likedMovies.map((m) => ({
        film: toScorerFilm(m),
        recommendations: (m.recommendations?.results ?? []).map(toScorerFilm),
      })),
      wanted: detailsOf(wanted).map(toScorerFilm),
      disliked: detailsOf(disliked).map(toScorerFilm),
      excluded: new Set(tagged?.map((r) => r.tmdbId)),
    },
    undefined,
    limit,
  )
  const recommendations: Recommendation[] = picks.flatMap(({ film, ...rest }) => {
    const movie = summaries.get(film.id)
    return movie ? [{ ...rest, movie }] : []
  })

  return {
    recommendations,
    hasLikes: liked.length > 0,
    loading: details.some((q) => q.isPending),
  }
}
