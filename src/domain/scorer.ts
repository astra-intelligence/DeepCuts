// Recommendation scorer v2 (ADR-0026, ADR-0028, ADR-0032): turns a person's tags into ranked
// film picks.
//
// How it works, in four steps:
// 1. Candidates: every film TMDB recommends for any film you liked, plus the other films in a
//    liked film's series ("Friday the 13th" brings in its sequels). A film suggested by several
//    of your likes is a stronger candidate.
// 2. Taste profile: a weight per genre and per keyword, built from your tags (liked +1, Want to
//    see +0.5, disliked −1), plus the decades, languages, directors, writers and series of the
//    films you liked.
// 3. Score: each candidate gets ten part scores between 0 and 1 (see DEFAULT_WEIGHTS), which are
//    combined with the weights into one score. "% match" is that score × 100.
//    Keywords, directors and writers need one extra details call per candidate, so the caller
//    fetches them only for the top candidates (`TasteInput.details`) and scores again: a re-rank
//    (ADR-0028). Candidates without details score 0 on those parts.
// 4. Rank: highest score first, spread out so one genre, series or director never clumps, with a
//    few "explore" slots for genres your likes haven't covered, so no genre is shut out.
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
  /** The film's writers, when its details are loaded. */
  writers?: readonly Person[]
  /** The TMDB series (collection) it belongs to, when known. */
  seriesId?: number | null
}

/** A person credited on a film (a director or a writer). */
export interface Person {
  id: number
  name: string
}

/** Details for a candidate, loaded only for the top candidates (ADR-0028). */
export interface FilmDetails {
  keywordIds: readonly number[]
  directors: readonly Person[]
  writers?: readonly Person[]
  seriesId?: number | null
}

/** Everything the scorer knows about one person's taste. */
export interface TasteInput {
  /**
   * Liked films (most recent first) with the films TMDB recommends for each, and the other films
   * in its series, if it belongs to one (ADR-0032).
   */
  liked: readonly {
    film: ScorerFilm
    recommendations: readonly ScorerFilm[]
    series?: readonly ScorerFilm[]
  }[]
  /** Want to see: a mild positive genre signal. */
  wanted: readonly ScorerFilm[]
  /** Disliked: a negative genre signal. Disliked films themselves are excluded via `excluded`. */
  disliked: readonly ScorerFilm[]
  /** Every film the person has tagged. None of them is ever recommended. */
  excluded: ReadonlySet<number>
  /** Keywords, directors, writers and series for some candidates, by film id (the re-rank). */
  details?: ReadonlyMap<number, FilmDetails>
}

/** The ten things a candidate is scored on. Each part is a number from 0 (worst) to 1 (best). */
export const SCORE_PARTS = [
  'support',
  'genre',
  'quality',
  'deepCut',
  'decade',
  'language',
  'keywords',
  'director',
  'writer',
  'series',
] as const
/** One of the ten score parts. */
export type ScorePart = (typeof SCORE_PARTS)[number]
/** How much each part counts toward the final score. */
export type Weights = Record<ScorePart, number>

/**
 * Weights v2 (ADR-0032). Genre drops from 34% to 15% so it nudges rather than gates; director,
 * writer and series carry the "more from what you liked" signal. Provisional: retune in the
 * weights lab. Normalized so they sum to exactly 1.
 */
export const DEFAULT_WEIGHTS: Weights = normalizeWeights({
  support: 0.22,
  genre: 0.15,
  quality: 0.07,
  deepCut: 0.12,
  decade: 0.07,
  language: 0.04,
  keywords: 0.12,
  director: 0.09,
  writer: 0.05,
  series: 0.07,
})

/** Each earlier pick with the same primary genre lowers a candidate's rank by this much. */
export const DIVERSITY_PENALTY = 0.05

/** At most this many picks from one series, or by one director (ADR-0032). */
export const SPREAD_CAP = 2

/**
 * Picks at these positions (0-based) go to a genre your likes haven't covered, when one is
 * available: 6th, 11th and 16th, so Discover's grid gets three, spaced out (ADR-0032).
 */
export const EXPLORE_SLOTS: readonly number[] = [5, 10, 15]

/**
 * A disliked genre lowers the genre part to this at the lowest (not 0), so a genre is never
 * shut out (ADR-0032). Neutral is 0.5; a fully liked genre is 1.
 */
const GENRE_FLOOR = 0.25

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
  /** Set when it shares a writer with a film you liked. */
  sameWriter?: { writer: string; liked: string }
  /** Set when it's in the same series as a film you liked: the liked film's title. */
  sameSeries?: { liked: string }
  /** True when it filled an explore slot: a genre your likes haven't covered (ADR-0032). */
  explore?: true
  /** The ten part scores (0–1), shown in the weights lab. */
  parts: Record<ScorePart, number>
}

// A film under consideration, before scoring: how many of your likes suggest it, and which.
interface Candidate {
  film: ScorerFilm
  support: number
  because: string[]
}

// Keeps a number between 0 and 1.
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
// 1984 → 1980; unknown years stay unknown.
const decadeOf = (year: number | null) => (year === null ? null : Math.floor(year / 10) * 10)

// Step 1: gathers every film your likes recommend, and the other films in their series, counting
// how many likes suggest each. A film both recommended by and in the series of one liked film
// counts once for it. Films you've already tagged, and a liked film suggesting itself, are skipped.
function collectCandidates(input: TasteInput): Map<number, Candidate> {
  const candidates = new Map<number, Candidate>()
  for (const { film: source, recommendations, series = [] } of input.liked) {
    const suggested = new Map([...recommendations, ...series].map((f) => [f.id, f]))
    for (const film of suggested.values()) {
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

// For each person (by id), the title of a liked film they worked on, from the given credits.
function likedBy(films: readonly ScorerFilm[], people: (f: ScorerFilm) => readonly Person[]) {
  const byPerson = new Map<number, string>()
  for (const f of films) for (const p of people(f)) byPerson.set(p.id, f.title)
  return byPerson
}

// The first of `people` who also worked on a liked film, with that film's title.
function firstShared(people: readonly Person[], liked: ReadonlyMap<number, string>) {
  return people
    .map((p) => ({ name: p.name, liked: liked.get(p.id) }))
    .find((p): p is { name: string; liked: string } => p.liked !== undefined)
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
  // Directors, writers and series of the films you liked, each with the liked film's title.
  const likedByDirector = likedBy(likedFilms, (f) => f.directors ?? [])
  const likedByWriter = likedBy(likedFilms, (f) => f.writers ?? [])
  const likedBySeries = new Map<number, string>()
  for (const f of likedFilms) if (f.seriesId) likedBySeries.set(f.seriesId, f.title)

  // Step 3: score each candidate.
  const scored = candidates.map((c): Pick => {
    const f = c.film
    const details = input.details?.get(f.id)
    // Genre fit: the average of your profile's weight (−1…1) for each of the film's genres.
    const genres = f.genreIds.map((g) => profile.get(g) ?? 0)
    const genreMean = genres.length ? genres.reduce((a, b) => a + b, 0) / genres.length : 0
    // Quality: the vote-weighted rating (see MIN_VOTES above).
    const v = f.voteCount
    const rating =
      (v / (v + MIN_VOTES)) * f.voteAverage + (MIN_VOTES / (v + MIN_VOTES)) * MEAN_RATING
    const decade = decadeOf(f.year)
    const director = firstShared(details?.directors ?? [], likedByDirector)
    const writer = firstShared(details?.writers ?? [], likedByWriter)
    // The series comes from the collection call (series candidates) or the loaded details.
    const seriesId = f.seriesId ?? details?.seriesId
    const series = seriesId ? likedBySeries.get(seriesId) : undefined
    const parts: Record<ScorePart, number> = {
      // Relative to the best-supported candidate, so the top one always scores 1.
      support: c.support / maxSupport,
      // Liked genres lift a film from neutral (0.5) up to 1. Disliked genres lower it only to
      // GENRE_FLOOR, so a genre can lose ground but is never ruled out (ADR-0032).
      genre: genreMean >= 0 ? (1 + genreMean) / 2 : 0.5 + (0.5 - GENRE_FLOOR) * genreMean,
      // A rating of 5 or less scores 0; 9 or more scores 1.
      quality: clamp01((rating - 5) / 4),
      // Lesser-known films score higher; log scale so one blockbuster doesn't flatten the rest.
      deepCut: maxPopularity > 0 ? 1 - Math.log1p(f.popularity) / Math.log1p(maxPopularity) : 0.5,
      // The share of your likes from the same decade, and in the same original language.
      decade: decade === null ? 0 : shareOf(likedDecades, decade),
      language: f.language ? shareOf(likedLanguages, f.language) : 0,
      // Relative to the best keyword match among candidates; 0 without loaded keywords.
      keywords: maxKeywordRaw > 0 ? keywordRaw(f.id) / maxKeywordRaw : 0,
      // All or nothing: a director, writer or series you've already liked, or not.
      director: director ? 1 : 0,
      writer: writer ? 1 : 0,
      series: series ? 1 : 0,
    }
    // The weighted sum of the parts. With weights summing to 1 this is already 0–1.
    const score = clamp01(SCORE_PARTS.reduce((sum, p) => sum + weights[p] * parts[p], 0))
    return {
      film: f,
      score,
      match: Math.round(score * 100),
      because: c.because.slice(0, 2),
      parts,
      ...(director && { sameDirector: { director: director.name, liked: director.liked } }),
      ...(writer && { sameWriter: { writer: writer.name, liked: writer.liked } }),
      ...(series && { sameSeries: { liked: series } }),
    }
  })

  return rank(scored, input, likedFilms, profile, diversityPenalty, limit)
}

// Step 4: rank greedily, one pick at a time. Each round takes the best remaining candidate after
// the genre-repeat penalty, from the first of these groups that has one:
// - explore rounds (EXPLORE_SLOTS) first try films whose primary genre no liked film has, a new
//   genre each time, and not one you've disliked;
// - then films that keep the feed spread out (no third film from one series or director, and
//   none next to a pick from the same series or director);
// - then anything, so the rules never leave the feed short.
// Ties break by film id so the order is always the same.
function rank(
  scored: Pick[],
  input: TasteInput,
  likedFilms: readonly ScorerFilm[],
  profile: ReadonlyMap<number, number>,
  diversityPenalty: number,
  limit: number,
): Pick[] {
  const likedGenres = new Set(likedFilms.flatMap((f) => f.genreIds))
  // A pick's series and directors, for the spread rules (directors need loaded details).
  const seriesOf = (p: Pick) => p.film.seriesId ?? input.details?.get(p.film.id)?.seriesId ?? null
  const directorsOf = (p: Pick) => (input.details?.get(p.film.id)?.directors ?? []).map((d) => d.id)

  const picks: Pick[] = []
  const usedGenres = new Map<number, number>()
  const usedSeries = new Map<number, number>()
  const usedDirectors = new Map<number, number>()
  // Explore picks always have a primary genre (see `exploring`); the type just can't say so.
  const exploredGenres = new Set<number | undefined>()
  const pool = [...scored].sort((a, b) => b.score - a.score || a.film.id - b.film.id)

  // Whether a candidate keeps the feed spread out, given the picks so far.
  const spreadOk = (p: Pick) => {
    const last = picks.at(-1)
    const series = seriesOf(p)
    if (series !== null) {
      if ((usedSeries.get(series) ?? 0) >= SPREAD_CAP) return false
      if (last && seriesOf(last) === series) return false
    }
    const lastDirectors = last ? directorsOf(last) : []
    return directorsOf(p).every(
      (d) => (usedDirectors.get(d) ?? 0) < SPREAD_CAP && !lastDirectors.includes(d),
    )
  }
  // Whether a candidate is in a genre your likes haven't covered (and you haven't disliked).
  const exploring = (p: Pick) => {
    const primary = p.film.genreIds[0]
    return (
      primary !== undefined &&
      !likedGenres.has(primary) &&
      !exploredGenres.has(primary) &&
      (profile.get(primary) ?? 0) >= 0
    )
  }
  // The index in `pool` of the best candidate passing `test`, after the genre-repeat penalty.
  const best = (test: (p: Pick) => boolean) => {
    let index = -1
    let bestValue = -Infinity
    pool.forEach((p, i) => {
      if (!test(p)) return
      const primary = p.film.genreIds[0]
      const repeats = primary === undefined ? 0 : (usedGenres.get(primary) ?? 0)
      const value = p.score - diversityPenalty * repeats
      if (value > bestValue) {
        index = i
        bestValue = value
      }
    })
    return index
  }

  while (picks.length < limit && pool.length > 0) {
    const explore = EXPLORE_SLOTS.includes(picks.length)
      ? best((p) => exploring(p) && spreadOk(p))
      : -1
    const spread = explore >= 0 ? explore : best(spreadOk)
    const chosen = spread >= 0 ? spread : best(() => true)
    // Take it out of the pool, and count its genre, series and directors for the next rounds.
    const [pick] = pool.splice(chosen, 1) as [Pick]
    const primary = pick.film.genreIds[0]
    if (primary !== undefined) usedGenres.set(primary, (usedGenres.get(primary) ?? 0) + 1)
    const series = seriesOf(pick)
    if (series !== null) usedSeries.set(series, (usedSeries.get(series) ?? 0) + 1)
    for (const d of directorsOf(pick)) usedDirectors.set(d, (usedDirectors.get(d) ?? 0) + 1)
    if (explore >= 0) {
      exploredGenres.add(primary)
      pick.explore = true
    }
    picks.push(pick)
  }
  return picks
}
