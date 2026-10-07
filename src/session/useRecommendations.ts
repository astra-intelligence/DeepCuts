// Feeds the scorer (ADR-0026) from the person's tags and cached TMDB details. One details call per
// tagged film, with its recommendations appended, so Detail pages, Discover and the weights lab
// share the cache.
import { useQueries, useQuery } from '@tanstack/react-query'
import { movieQueries } from '../api/queries'
import { releaseYear, type MovieDetail, type MovieSummary } from '../api/tmdb'
import {
  recommend,
  type Pick,
  type RecommendOptions,
  type ScorerFilm,
  type TasteInput,
} from '../domain/scorer'
import { useTagQueries } from './tagQueries'

/** How many recent tags of each kind inform the feed (bounds the number of calls). */
const LIMITS = { liked: 20, watchlist: 10, disliked: 10 } as const

export interface Recommendation extends Omit<Pick, 'film'> {
  movie: MovieSummary
}

// Converts TMDB's data (either shape) into the plain facts the scorer uses, so the scorer never
// depends on TMDB's field names.
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

/** The person's taste, loaded once and scored as often as needed (Discover, the weights lab). */
export interface Taste {
  hasLikes: boolean
  loading: boolean
  /** Scores the taste, keeping picks whose TMDB summary is known (for posters and links). */
  score: (options?: RecommendOptions) => Recommendation[]
}

/** Loads the current person's taste (their recent tags plus each tagged film's details). */
export function useTaste(): Taste {
  const tagQueries = useTagQueries()
  const liked = (useQuery(tagQueries.list('liked')).data ?? []).slice(0, LIMITS.liked)
  const wanted = (useQuery(tagQueries.list('watchlist')).data ?? []).slice(0, LIMITS.watchlist)
  const disliked = (useQuery(tagQueries.list('disliked')).data ?? []).slice(0, LIMITS.disliked)
  const tagged = useQuery(tagQueries.all()).data

  const ids = [...new Set([...liked, ...wanted, ...disliked])]
  // One details call per tagged film, all in parallel; already-cached films cost nothing.
  const details = useQueries({ queries: ids.map((id) => movieQueries.detail(id)) })
  const byId = new Map<number, MovieDetail>()
  details.forEach((q, i) => {
    const id = ids[i]
    if (q.data && id !== undefined) byId.set(id, q.data)
  })
  const detailsOf = (list: number[]) => list.flatMap((id) => byId.get(id) ?? [])

  const likedMovies = detailsOf(liked)
  // TMDB's own summaries of every candidate film, to show posters and titles for the picks.
  const summaries = new Map(
    likedMovies.flatMap((m) => (m.recommendations?.results ?? []).map((r) => [r.id, r] as const)),
  )
  const input: TasteInput = {
    liked: likedMovies.map((m) => ({
      film: toScorerFilm(m),
      recommendations: (m.recommendations?.results ?? []).map(toScorerFilm),
    })),
    wanted: detailsOf(wanted).map(toScorerFilm),
    disliked: detailsOf(disliked).map(toScorerFilm),
    excluded: new Set(tagged?.map((r) => r.tmdbId)),
  }

  return {
    hasLikes: liked.length > 0,
    loading: details.some((q) => q.isPending),
    // Scoring a few hundred candidates is well under a millisecond, so it simply runs each render.
    score: (options) =>
      recommend(input, options).flatMap(({ film, ...rest }) => {
        const movie = summaries.get(film.id)
        return movie ? [{ ...rest, movie }] : []
      }),
  }
}

/** Discover's picks with the default weights: `{ recommendations, hasLikes, loading }`. */
export function useRecommendations(limit = 20) {
  const { score, hasLikes, loading } = useTaste()
  return { recommendations: score({ limit }), hasLikes, loading }
}
