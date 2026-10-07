// Recommendation scorer v1.1 (ADR-0026, ADR-0028): turns a person's tags into ranked film picks.
//
// How it works, in four steps:
// 1. Candidates: every film TMDB recommends for any film you liked. A film recommended by
//    several of your likes is a stronger candidate.
// 2. Taste profile: a weight per genre and per keyword, built from your tags (liked +1, Want to
//    see +0.5, disliked −1), plus the decades, languages and directors of the films you liked.
// 3. Score: each candidate gets eight part scores between 0 and 1 (see DEFAULT_WEIGHTS), which are
//    combined with the weights into one score. "% match" is that score × 100.
//    Keywords and directors need one extra details call per candidate, so the caller fetches
//    them only for the top candidates (`TasteInput.details`) and scores again: a re-rank
//    (ADR-0028). Candidates without details score 0 on those two parts.
// 4. Rank: highest score first, with a small penalty for repeating a genre so the feed stays varied.
//
// Pure and deterministic: no network, no randomness, so the same tags always give the same
// picks, every pick can say why it was chosen ("because you liked …"), and it is fully testable.

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
  /** TMDB keyword ids ("time loop", "cabin in the woods"…), when the film's details are loaded. */
  keywordIds?: readonly number[]
  /** The film's directors, when its details are loaded. */
  directors?: readonly Person[]
}

/** A person credited on a film (today: directors). */
export interface Person {
  id: number
  name: string
}

/** Keywords and directors for a candidate, loaded only for the top candidates (ADR-0028). */
export interface FilmDetails {
  keywordIds: readonly number[]
  directors: readonly Person[]
}

/** Everything the scorer knows about one person's taste. */
export interface TasteInput {
  /** Liked films (most recent first) with the films TMDB recommends for each. */
  liked: readonly { film: ScorerFilm; recommendations: readonly ScorerFilm[] }[]
  /** Want to see: a mild positive genre signal. */
  wanted: readonly ScorerFilm[]
  /** Disliked: a negative genre signal. Disliked films themselves are excluded via `excluded`. */
  disliked: readonly ScorerFilm[]
  /** Every film the person has tagged. None of them is ever recommended. */
  excluded: ReadonlySet<number>
  /** Keywords and directors for some candidates, by film id (the re-rank pass, ADR-0028). */
  details?: ReadonlyMap<number, FilmDetails>
}

/** The eight things a candidate is scored on. Each part is a number from 0 (worst) to 1 (best). */
export const SCORE_PARTS = [
  'support',
  'genre',
  'quality',
  'deepCut',
  'decade',
  'language',
  'keywords',
  'director',
] as const
/** One of the eight score parts. */
export type ScorePart = (typeof SCORE_PARTS)[number]
/** How much each part counts toward the final score. */
export type Weights = Record<ScorePart, number>

/**
 * The owner's tuned weights (ADR-0026, chosen in the weights lab 2026-10-06), plus provisional
 * weights for the two v1.1 parts (ADR-0028), all scaled to sum to exactly 1. Adding parts
 * shrinks the others in proportion; retune in the weights lab.
 */
export const DEFAULT_WEIGHTS: Weights = normalizeWeights({
  support: 0.32,
  genre: 0.34,
  quality: 0.07,
  deepCut: 0.14,
  decade: 0.09,
  language: 0.05,
  keywords: 0.15,
  director: 0.05,
})

/** Each earlier pick with the same primary genre lowers a candidate's rank by this much. */
export const DIVERSITY_PENALTY = 0.05

/** Scales weights to sum to 1, so any mix (e.g. from the tuning sliders) keeps scores in 0–1. */
export function normalizeWeights(weights: Weights): Weights {
  const total = SCORE_PARTS.reduce((sum, p) => sum + Math.max(0, weights[p]), 0)
  return Object.fromEntries(
    SCORE_PARTS.map((p) => [p, total === 0 ? 0 : Math.max(0, weights[p]) / total]),
  ) as Weights
}

/** Optional settings for `recommend` (the weights lab passes its own). */
export interface RecommendOptions {
  /** Defaults to DEFAULT_WEIGHTS. Should sum to 1 (see normalizeWeights). */
  weights?: Weights
  /** How much each repeat of a genre lowers a film's rank. Defaults to DIVERSITY_PENALTY. */
  diversityPenalty?: number
  /** How many picks to return. Defaults to 20. */
  limit?: number
}
/** Votes needed before a film's own rating outweighs the average (Bayesian shrinkage). */
// A film with 3 votes averaging 10 shouldn't beat a classic with 5,000 votes averaging 8.5, so a
// rating is blended with the typical TMDB rating (about 6.5) until it has enough votes to trust.
const MIN_VOTES = 100
const MEAN_RATING = 6.5

/** One recommended film, with its score and the reasons for it. */
export interface Pick {
  film: ScorerFilm
  /** 0–1, before the diversity adjustment. */
  score: number
  /** Whole-number percentage shown to the user: score × 100, no inflation. */
  match: number
  /** Titles of liked films that recommended it, at most two. */
  because: string[]
  /** Set when it shares a director with a film you liked: "John Carpenter", "The Thing". */
  sameDirector?: { director: string; liked: string }
  /** The six part scores (0–1), shown in the weights lab. */
  parts: Record<ScorePart, number>
}

// A film under consideration, before scoring: how many of your likes recommend it, and which.
interface Candidate {
  film: ScorerFilm
  support: number
  because: string[]
}

// Keeps a number between 0 and 1.
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
// 1984 → 1980; unknown years stay unknown.
const decadeOf = (year: number | null) => (year === null ? null : Math.floor(year / 10) * 10)

// Step 1: gathers every film your likes recommend, counting how many likes recommend each.
// Films you've already tagged, and a liked film recommending itself, are skipped.
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
  // Scale so the strongest genre is ±1 and the others are relative to it.
  const max = Math.max(0, ...[...raw.values()].map(Math.abs))
  return new Map([...raw].map(([g, w]) => [g, max === 0 ? 0 : w / max]))
}

/** Keyword weights, unscaled: liked +1, Want to see +0.5, disliked −1, from loaded keywords. */
function keywordProfile(input: TasteInput): Map<number, number> {
  const weights = new Map<number, number>()
  const add = (films: readonly ScorerFilm[], weight: number) => {
    for (const f of films)
      for (const k of f.keywordIds ?? []) weights.set(k, (weights.get(k) ?? 0) + weight)
  }
  add(
    input.liked.map((l) => l.film),
    1,
  )
  add(input.wanted, 0.5)
  add(input.disliked, -1)
  return weights
}

/** Share of `values` equal to `value`. Only called with likes present (no likes, no candidates). */
function shareOf<T>(values: readonly T[], value: T): number {
  return values.filter((v) => v === value).length / values.length
}

/**
 * Ranks films for a person: the main entry point (Discover and the weights lab call it).
 * Returns at most `limit` picks, best first; an empty list when there are no likes yet.
 */
export function recommend(
  input: TasteInput,
  {
    weights = DEFAULT_WEIGHTS,
    diversityPenalty = DIVERSITY_PENALTY,
    limit = 20,
  }: RecommendOptions = {},
): Pick[] {
  // Step 1: candidates. Without likes there are none, and nothing to recommend.
  const candidates = [...collectCandidates(input).values()]
  if (candidates.length === 0) return []

  // Step 2: the taste profile, and the highest values used to scale parts to 0–1.
  const profile = genreProfile(input)
  const likedFilms = input.liked.map((l) => l.film)
  const likedDecades = likedFilms.map((f) => decadeOf(f.year))
  const likedLanguages = likedFilms.map((f) => f.language)
  const maxSupport = Math.max(...candidates.map((c) => c.support))
  const maxPopularity = Math.max(...candidates.map((c) => c.film.popularity))
  // Keywords: how strongly a candidate's keywords overlap your profile (negative counts as 0).
  const keywords = keywordProfile(input)
  const keywordRaw = (id: number) =>
    Math.max(
      0,
      (input.details?.get(id)?.keywordIds ?? []).reduce(
        (sum, k) => sum + (keywords.get(k) ?? 0),
        0,
      ),
    )
  const maxKeywordRaw = Math.max(0, ...candidates.map((c) => keywordRaw(c.film.id)))
  // Directors of the films you liked, and which liked film each one made.
  const likedByDirector = new Map<number, string>()
  for (const f of likedFilms) for (const d of f.directors ?? []) likedByDirector.set(d.id, f.title)

  // Step 3: score each candidate.
  const scored = candidates.map((c): Pick => {
    const f = c.film
    // Genre fit: the average of your profile's weight (−1…1) for each of the film's genres.
    const genres = f.genreIds.map((g) => profile.get(g) ?? 0)
    const genreMean = genres.length ? genres.reduce((a, b) => a + b, 0) / genres.length : 0
    // Quality: the vote-weighted rating (see MIN_VOTES above).
    const v = f.voteCount
    const rating =
      (v / (v + MIN_VOTES)) * f.voteAverage + (MIN_VOTES / (v + MIN_VOTES)) * MEAN_RATING
    const decade = decadeOf(f.year)
    // Same director: the first of the candidate's directors who also made a film you liked.
    const director = (input.details?.get(f.id)?.directors ?? [])
      .map((d) => ({ name: d.name, liked: likedByDirector.get(d.id) }))
      .find((d): d is { name: string; liked: string } => d.liked !== undefined)
    const parts: Record<ScorePart, number> = {
      // Relative to the best-supported candidate, so the top one always scores 1.
      support: c.support / maxSupport,
      // −1…1 mapped onto 0…1, so a neutral genre scores 0.5.
      genre: (genreMean + 1) / 2,
      // A rating of 5 or less scores 0; 9 or more scores 1.
      quality: clamp01((rating - 5) / 4),
      // Lesser-known films score higher; log scale so one blockbuster doesn't flatten the rest.
      deepCut: maxPopularity > 0 ? 1 - Math.log1p(f.popularity) / Math.log1p(maxPopularity) : 0.5,
      // The share of your likes from the same decade, and in the same original language.
      decade: decade === null ? 0 : shareOf(likedDecades, decade),
      language: f.language ? shareOf(likedLanguages, f.language) : 0,
      // Relative to the best keyword match among candidates; 0 without loaded keywords.
      keywords: maxKeywordRaw > 0 ? keywordRaw(f.id) / maxKeywordRaw : 0,
      // All or nothing: a director you've already liked, or not.
      director: director ? 1 : 0,
    }
    // The weighted sum of the parts. With weights summing to 1 this is already 0–1.
    const score = clamp01(SCORE_PARTS.reduce((sum, p) => sum + weights[p] * parts[p], 0))
    const pick: Pick = {
      film: f,
      score,
      match: Math.round(score * 100),
      because: c.because.slice(0, 2),
      parts,
    }
    if (director) {
      pick.sameDirector = { director: director.name, liked: director.liked }
    }
    return pick
  })

  // Step 4: rank greedily, one pick at a time, nudging down candidates whose primary genre is
  // already well represented. Ties break by film id so the order is always the same.
  const picks: Pick[] = []
  const usedGenres = new Map<number, number>()
  const pool = [...scored].sort((a, b) => b.score - a.score || a.film.id - b.film.id)
  while (picks.length < limit && pool.length > 0) {
    let best = 0
    let bestValue = -Infinity
    // Find the best remaining candidate after the genre-repeat penalty.
    pool.forEach((p, i) => {
      const primary = p.film.genreIds[0]
      const repeats = primary === undefined ? 0 : (usedGenres.get(primary) ?? 0)
      const value = p.score - diversityPenalty * repeats
      if (value > bestValue) {
        best = i
        bestValue = value
      }
    })
    // Take it out of the pool, and count its genre for the next round's penalty.
    const [pick] = pool.splice(best, 1) as [Pick]
    const primary = pick.film.genreIds[0]
    if (primary !== undefined) usedGenres.set(primary, (usedGenres.get(primary) ?? 0) + 1)
    picks.push(pick)
  }
  return picks
}
