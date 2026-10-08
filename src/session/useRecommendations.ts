// Feeds the scorer (ADR-0026, ADR-0028, ADR-0032) from the person's tags and cached TMDB data.
//
// Two passes:
// 1. One details call per tagged film (with recommendations, keywords and credits appended), plus
//    one series call per liked series (MAX_SERIES at most), gives the candidates; the scorer
//    ranks them.
// 2. The top RERANK candidates get one details call each for their keywords, credits and series, and
//    the scorer ranks again with them. Every call is the same cached details query the Detail
//    page uses, so opening a recommended film afterwards costs nothing.
import { useQueries, useQuery } from '@tanstack/react-query'
import { movieQueries } from '../api/queries'
import { crewOf, releaseYear, type MovieDetail, type MovieSummary } from '../api/tmdb'
import {
  recommend,
  type FilmDetails,
  type Pick,
  type RecommendOptions,
  type ScorerFilm,
  type TasteInput,
} from '../domain/scorer'
import { useTagQueries } from './tagQueries'

// These three caps bound how many proxy calls a first Discover load makes, which must stay well
// under the per-client rate limit (workers/rate-limit/wrangler.toml). feedBudget.test.ts adds
// them up and fails if a change here would push a heavy profile's first load over it.

/**
 * How many recent tags of each kind inform the feed (bounds the number of calls). Likes drive the
 * candidates, so they get the most; the watchlist and dislikes only nudge scores, so 5 each is
 * enough (cut from 10 to fit the rate limit, owner 2026-10-07).
 */
export const LIMITS = { liked: 20, watchlist: 5, disliked: 5 } as const
/** How many top candidates get their keywords and directors loaded for the re-rank (ADR-0028). */
export const RERANK = 20
/** How many liked series (most recent likes first) bring their films in as candidates. */
export const MAX_SERIES = 10

export interface Recommendation extends Omit<Pick, 'film'> {
  movie: MovieSummary
}

// A film's keywords, directors, writers and series, from its details (empty when TMDB has none).
function detailsOf(m: MovieDetail): FilmDetails {
  return {
    keywordIds: m.keywords?.keywords.map((k) => k.id) ?? [],
    ...crewOf(m),
    seriesId: m.belongs_to_collection?.id ?? null,
  }
}

// "2026-10-07" style dates compare correctly as strings; a missing date sorts first and counts
// as unreleased, so announced sequels without a date stay out.
const today = () => new Date().toISOString().slice(0, 10)
const isReleased = (m: MovieSummary) => m.release_date !== '' && m.release_date <= today()

// Converts TMDB's data (either shape) into the plain facts the scorer uses, so the scorer never
// depends on TMDB's field names. Full details also carry keywords and directors.
function toScorerFilm(m: MovieSummary | MovieDetail): ScorerFilm {
  return {
    ...('genres' in m && detailsOf(m)),
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
  const moviesFor = (list: number[]) => list.flatMap((id) => byId.get(id) ?? [])

  const likedMovies = moviesFor(liked)
  // The series of your liked films (ADR-0032): one cached call each, newest likes first.
  const seriesIds = [
    ...new Set(likedMovies.flatMap((m) => m.belongs_to_collection?.id ?? [])),
  ].slice(0, MAX_SERIES)
  const seriesQueries = useQueries({
    queries: seriesIds.map((id) => movieQueries.collection(id)),
  })
  // Each series' released films, by series id. A series that fails to load just adds nothing.
  const seriesFilms = new Map<number, MovieSummary[]>()
  seriesQueries.forEach((q, i) => {
    const id = seriesIds[i]
    if (q.data && id !== undefined) seriesFilms.set(id, q.data.parts.filter(isReleased))
  })
  const seriesOf = (m: MovieDetail) => {
    const id = m.belongs_to_collection?.id
    return id === undefined ? [] : (seriesFilms.get(id) ?? [])
  }
  // TMDB's own summaries of every candidate film, to show posters and titles for the picks.
  const summaries = new Map(
    likedMovies.flatMap((m) =>
      [...(m.recommendations?.results ?? []), ...seriesOf(m)].map((r) => [r.id, r] as const),
    ),
  )
  const input: TasteInput = {
    liked: likedMovies.map((m) => ({
      film: toScorerFilm(m),
      recommendations: (m.recommendations?.results ?? []).map(toScorerFilm),
      // Series films carry their series id, so the series part and spread rules know them.
      series: seriesOf(m).map((f) => ({
        ...toScorerFilm(f),
        seriesId: m.belongs_to_collection?.id ?? null,
      })),
    })),
    wanted: moviesFor(wanted).map(toScorerFilm),
    disliked: moviesFor(disliked).map(toScorerFilm),
    excluded: new Set(tagged?.map((r) => r.tmdbId)),
  }

  // Pass 2: load keywords, credits and series for the top candidates (default weights, so the set of
  // films fetched doesn't change while someone drags the weights lab sliders).
  const top = recommend(input, { limit: RERANK }).map((p) => p.film.id)
  const topDetails = useQueries({ queries: top.map((id) => movieQueries.detail(id)) })
  const candidateDetails = new Map<number, FilmDetails>()
  topDetails.forEach((q, i) => {
    const id = top[i]
    if (q.data && id !== undefined) candidateDetails.set(id, detailsOf(q.data))
  })
  const reranked: TasteInput = { ...input, details: candidateDetails }

  return {
    hasLikes: liked.length > 0,
    // Still loading until both passes are in, so the picks don't reshuffle on screen.
    loading:
      details.some((q) => q.isPending) ||
      seriesQueries.some((q) => q.isPending) ||
      topDetails.some((q) => q.isPending),
    // Scoring a few hundred candidates is well under a millisecond, so it simply runs each render.
    score: (options) =>
      recommend(reranked, options).flatMap(({ film, ...rest }) => {
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
