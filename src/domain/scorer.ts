// Recommendation scorer v1 (ADR-0026). Pure and deterministic: the same tags always give the same
// picks, and every pick can say why it was chosen ("because you liked …").

/** The facts about a film the scorer uses. Mapped from TMDB data outside the domain. */
export interface ScorerFilm {
  id: number
  title: string
  genreIds: readonly number[]
  year: number | null
  language: string
  popularity: number
  voteAverage: number
  voteCount: number
}

export interface TasteInput {
  /** Liked films (most recent first) with the films TMDB recommends for each. */
  liked: readonly { film: ScorerFilm; recommendations: readonly ScorerFilm[] }[]
  /** Want to see: a mild positive genre signal. */
  wanted: readonly ScorerFilm[]
  /** Disliked: a negative genre signal. Disliked films themselves are excluded via `excluded`. */
  disliked: readonly ScorerFilm[]
  /** Every film the person has tagged. None of them is ever recommended. */
  excluded: ReadonlySet<number>
}

export const SCORE_PARTS = ['support', 'genre', 'quality', 'deepCut', 'decade', 'language'] as const
export type ScorePart = (typeof SCORE_PARTS)[number]
export type Weights = Record<ScorePart, number>

/** Provisional weights (ADR-0026); they sum to 1, so a score is always between 0 and 1. */
export const DEFAULT_WEIGHTS: Weights = {
  support: 0.35,
  genre: 0.25,
  quality: 0.15,
  deepCut: 0.1,
  decade: 0.1,
  language: 0.05,
}

/** Each earlier pick with the same primary genre lowers a candidate's rank by this much. */
export const DIVERSITY_PENALTY = 0.03

/** Scales weights to sum to 1, so any mix (e.g. from the tuning sliders) keeps scores in 0–1. */
export function normalizeWeights(weights: Weights): Weights {
  const total = SCORE_PARTS.reduce((sum, p) => sum + Math.max(0, weights[p]), 0)
  return Object.fromEntries(
    SCORE_PARTS.map((p) => [p, total === 0 ? 0 : Math.max(0, weights[p]) / total]),
  ) as Weights
}

export interface RecommendOptions {
  /** Defaults to DEFAULT_WEIGHTS. Should sum to 1 (see normalizeWeights). */
  weights?: Weights
  diversityPenalty?: number
  limit?: number
}
/** Votes needed before a film's own rating outweighs the average (Bayesian shrinkage). */
const MIN_VOTES = 100
const MEAN_RATING = 6.5

export interface Pick {
  film: ScorerFilm
  /** 0–1, before the diversity adjustment. */
  score: number
  /** Whole-number percentage shown to the user: score × 100, no inflation. */
  match: number
  /** Titles of liked films that recommended it, at most two. */
  because: string[]
  parts: Record<ScorePart, number>
}

interface Candidate {
  film: ScorerFilm
  support: number
  because: string[]
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const decadeOf = (year: number | null) => (year === null ? null : Math.floor(year / 10) * 10)

function collectCandidates(input: TasteInput): Map<number, Candidate> {
  const candidates = new Map<number, Candidate>()
  for (const { film: source, recommendations } of input.liked) {
    for (const film of recommendations) {
      if (input.excluded.has(film.id) || film.id === source.id) continue
      const c = candidates.get(film.id) ?? { film, support: 0, because: [] }
      c.support += 1
      if (!c.because.includes(source.title)) c.because.push(source.title)
      candidates.set(film.id, c)
    }
  }
  return candidates
}

/** Genre weights in [-1, 1]: liked +1, Want to see +0.5, disliked −1, scaled by the largest. */
function genreProfile(input: TasteInput): Map<number, number> {
  const raw = new Map<number, number>()
  const add = (films: readonly ScorerFilm[], weight: number) => {
    for (const f of films) for (const g of f.genreIds) raw.set(g, (raw.get(g) ?? 0) + weight)
  }
  add(
    input.liked.map((l) => l.film),
    1,
  )
  add(input.wanted, 0.5)
  add(input.disliked, -1)
  const max = Math.max(0, ...[...raw.values()].map(Math.abs))
  return new Map([...raw].map(([g, w]) => [g, max === 0 ? 0 : w / max]))
}

/** Share of `values` equal to `value`. Only called with likes present (no likes, no candidates). */
function shareOf<T>(values: readonly T[], value: T): number {
  return values.filter((v) => v === value).length / values.length
}

export function recommend(
  input: TasteInput,
  {
    weights = DEFAULT_WEIGHTS,
    diversityPenalty = DIVERSITY_PENALTY,
    limit = 20,
  }: RecommendOptions = {},
): Pick[] {
  const candidates = [...collectCandidates(input).values()]
  if (candidates.length === 0) return []

  const profile = genreProfile(input)
  const likedFilms = input.liked.map((l) => l.film)
  const likedDecades = likedFilms.map((f) => decadeOf(f.year))
  const likedLanguages = likedFilms.map((f) => f.language)
  const maxSupport = Math.max(...candidates.map((c) => c.support))
  const maxPopularity = Math.max(...candidates.map((c) => c.film.popularity))

  const scored = candidates.map((c): Pick => {
    const f = c.film
    const genres = f.genreIds.map((g) => profile.get(g) ?? 0)
    const genreMean = genres.length ? genres.reduce((a, b) => a + b, 0) / genres.length : 0
    const v = f.voteCount
    const rating =
      (v / (v + MIN_VOTES)) * f.voteAverage + (MIN_VOTES / (v + MIN_VOTES)) * MEAN_RATING
    const decade = decadeOf(f.year)
    const parts: Record<ScorePart, number> = {
      support: c.support / maxSupport,
      genre: (genreMean + 1) / 2,
      quality: clamp01((rating - 5) / 4),
      // Lesser-known films score higher; log scale so one blockbuster doesn't flatten the rest.
      deepCut: maxPopularity > 0 ? 1 - Math.log1p(f.popularity) / Math.log1p(maxPopularity) : 0.5,
      decade: decade === null ? 0 : shareOf(likedDecades, decade),
      language: f.language ? shareOf(likedLanguages, f.language) : 0,
    }
    const score = clamp01(SCORE_PARTS.reduce((sum, p) => sum + weights[p] * parts[p], 0))
    return { film: f, score, match: Math.round(score * 100), because: c.because.slice(0, 2), parts }
  })

  // Rank greedily, nudging down candidates whose primary genre is already well represented.
  const picks: Pick[] = []
  const usedGenres = new Map<number, number>()
  const pool = [...scored].sort((a, b) => b.score - a.score || a.film.id - b.film.id)
  while (picks.length < limit && pool.length > 0) {
    let best = 0
    let bestValue = -Infinity
    pool.forEach((p, i) => {
      const primary = p.film.genreIds[0]
      const repeats = primary === undefined ? 0 : (usedGenres.get(primary) ?? 0)
      const value = p.score - diversityPenalty * repeats
      if (value > bestValue) {
        best = i
        bestValue = value
      }
    })
    const [pick] = pool.splice(best, 1) as [Pick]
    const primary = pick.film.genreIds[0]
    if (primary !== undefined) usedGenres.set(primary, (usedGenres.get(primary) ?? 0) + 1)
    picks.push(pick)
  }
  return picks
}
