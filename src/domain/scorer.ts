// Recommendation scorer v3 (ADR-0026, ADR-0028, ADR-0032, ADR-0037, ADR-0038): turns a person's
// tags into ranked film picks.
//
// How it works, in four steps:
// 1. Candidates: every film TMDB recommends for any film you liked, the well-voted films in a
//    shared genre that TMDB lists as similar to it, and the next film you haven't tagged in its
//    series ("Friday the 13th" brings in Part 2). Plus well-rated films tagged with the keywords
//    your likes share most ("slasher"), found by a keyword search (ADR-0038). A film suggested by
//    several of your likes, or searches, is a stronger candidate.
// 2. Taste profile: a weight per genre and per keyword, built from your tags (liked +1, Want to
//    see +0.5, disliked −1), plus the decades, languages, directors, writers, actors, studios and
//    series of the films you liked.
// 3. Score: each candidate gets twelve part scores between 0 and 1 (see DEFAULT_WEIGHTS), which
//    are combined with the weights into one score. "% match" is that score × 100.
//    Keywords, credits and studios need one extra details call per candidate, so the caller
//    fetches them only for the top candidates (`TasteInput.details`) and scores again: a re-rank
//    (ADR-0028). Candidates without details score 0 on those parts. A film in the series of one
//    you liked is credited for that once, by the series part: its keyword, director, writer,
//    cast and studio parts only count what it shares with liked films outside that series
//    (ADR-0037).
// 4. Rank: highest score first, spread out so one genre, series or director never clumps, with a
//    few "explore" slots for genres your likes haven't covered, so no genre is shut out. At most
//    one film per series, and a few in all from the series you liked (ADR-0037).
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
  /** Its top-billed actors, when its details are loaded (ADR-0038). */
  cast?: readonly Person[]
  /** The companies that made it, when its details are loaded (ADR-0038). */
  companies?: readonly Person[]
  /** The TMDB series (collection) it belongs to, when known. */
  seriesId?: number | null
}

/** A person credited on a film (a director, writer or actor), or a production company. */
export interface Person {
  id: number
  name: string
}

/** Details for a candidate, loaded only for the top candidates (ADR-0028). */
export interface FilmDetails {
  keywordIds: readonly number[]
  directors: readonly Person[]
  writers?: readonly Person[]
  cast?: readonly Person[]
  companies?: readonly Person[]
  seriesId?: number | null
}

/** Just the tags of a taste: enough to choose the keywords to search (ADR-0038). */
export interface TasteTags {
  liked: TasteInput['liked']
  wanted: TasteInput['wanted']
  disliked: TasteInput['disliked']
}

/** Films found by searching one keyword your likes share (ADR-0038). */
export interface KeywordSearch {
  keywordId: number
  films: readonly ScorerFilm[]
}

/** Everything the scorer knows about one person's taste. */
export interface TasteInput {
  /**
   * Liked films (most recent first) with the films TMDB recommends for each, the films TMDB lists
   * as similar, and the films in its series, if it belongs to one (ADR-0032). Only the earliest
   * series film you haven't tagged becomes a candidate (ADR-0037).
   */
  liked: readonly {
    film: ScorerFilm
    recommendations: readonly ScorerFilm[]
    similar?: readonly ScorerFilm[]
    series?: readonly ScorerFilm[]
  }[]
  /** Want to see: a mild positive genre signal. */
  wanted: readonly ScorerFilm[]
  /** Disliked: a negative genre signal. Disliked films themselves are excluded via `excluded`. */
  disliked: readonly ScorerFilm[]
  /** Every film the person has tagged. None of them is ever recommended. */
  excluded: ReadonlySet<number>
  /** The results of searching `keywordsToSearch(input)`, one entry per keyword (ADR-0038). */
  keywordSearches?: readonly KeywordSearch[]
  /** Keywords, credits, studios and series for some candidates, by film id (the re-rank). */
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
  'cast',
  'studio',
] as const
/** One of the twelve score parts. */
export type ScorePart = (typeof SCORE_PARTS)[number]
/** How much each part counts toward the final score. */
export type Weights = Record<ScorePart, number>

/**
 * Weights v3 (ADR-0037), tuned by the owner in the weights lab on 2026-10-12. Support and keywords
 * drop and quality, genre, decade and language rise, so one strong signal can't carry a film.
 * Cast and studio (ADR-0038) start at 0, so the owner's tuned mix applies exactly; raise them in
 * the lab. They add up to 1.02, so they're normalized to sum to exactly 1.
 */
export const DEFAULT_WEIGHTS: Weights = normalizeWeights({
  support: 0.17,
  genre: 0.17,
  quality: 0.14,
  deepCut: 0.11,
  decade: 0.09,
  language: 0.06,
  keywords: 0.08,
  director: 0.08,
  writer: 0.05,
  series: 0.07,
  cast: 0,
  studio: 0,
})

/**
 * Each earlier pick with the same primary genre lowers a candidate's rank by this much (tuned to
 * 0.03 on 2026-10-12, ADR-0037; was 0.05).
 */
export const DIVERSITY_PENALTY = 0.03

/**
 * TMDB's similar films include barely-rated ones (1 vote, 0 votes) that the deep-cut part would
 * lift. A similar film needs this many votes, and a genre in common with the liked film, to be a
 * candidate (ADR-0037).
 */
export const SIMILAR_MIN_VOTES = 50

/** How many of your likes' shared keywords are searched for candidates (ADR-0038). */
export const KEYWORD_SEARCHES = 3

/**
 * Keywords too general to say anything about taste, so they're never searched (ADR-0038):
 * based on novel or book, based on true story, based on comic, sequel, remake, murder, woman
 * director, and the during- and after-credits stingers.
 */
export const GENERIC_KEYWORDS: ReadonlySet<number> = new Set([
  818, 9672, 9717, 9663, 9714, 9826, 187056, 179431, 179430,
])

/**
 * The major studios and distributors: sharing one says little about taste, so the studio part
 * ignores them (ADR-0038). Studios with a clear identity (New Line, Miramax, Blumhouse, Hammer…)
 * still count. Disney, Paramount, Columbia, DreamWorks, MGM, 20th Century Fox and Studios,
 * Universal, Sony, United Artists, Village Roadshow, Warner Bros., Summit, TriStar, StudioCanal,
 * Legendary, Lions Gate and Lionsgate, Relativity.
 */
export const MAJOR_STUDIOS: ReadonlySet<number> = new Set([
  2, 4, 5, 7, 21, 25, 127928, 33, 34, 60, 79, 174, 491, 559, 694, 923, 35, 1632, 7295,
])

/** At most this many picks by one director (ADR-0032). */
export const SPREAD_CAP = 2

/** At most this many picks from one series (ADR-0037; was 2 in ADR-0032). */
export const SERIES_CAP = 1

/**
 * At most this many picks in all from the series of films you liked, so sequels can't fill the
 * feed (ADR-0037).
 */
export const SERIES_PICKS = 3

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
  /** Set when a top-billed actor was also in a film you liked (ADR-0038). */
  sameCast?: { actor: string; liked: string }
  /** Set when a studio (not a major) also made a film you liked (ADR-0038). */
  sameStudio?: { studio: string; liked: string }
  /** True when it filled an explore slot: a genre your likes haven't covered (ADR-0032). */
  explore?: true
  /** The twelve part scores (0–1), shown in the weights lab. */
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

// The series film to suggest: the earliest one you haven't tagged (Part 2 after you like the
// original, Part 3 once you've tagged Part 2). Unknown years go last; ties go by id.
function nextInSeries(
  series: readonly ScorerFilm[],
  source: ScorerFilm,
  excluded: ReadonlySet<number>,
) {
  const untagged = series.filter((f) => !excluded.has(f.id) && f.id !== source.id)
  untagged.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.id - b.id)
  return untagged.slice(0, 1)
}

/**
 * The keywords to search for candidates (ADR-0038): the ones in your taste profile that weigh at
 * least 2 (two likes, say, or three likes and a dislike), strongest first, leaving out
 * GENERIC_KEYWORDS. Ties go by id, so the same tags always search the same keywords.
 */
export function keywordsToSearch(input: TasteTags): number[] {
  return [...keywordProfile(input, () => true)]
    .filter(([k, w]) => w >= 2 && !GENERIC_KEYWORDS.has(k))
    .sort(([a, wa], [b, wb]) => wb - wa || a - b)
    .slice(0, KEYWORD_SEARCHES)
    .map(([k]) => k)
}

// Step 1: gathers every film your likes recommend or list as similar, and the next film in their
// series, counting how many likes suggest each. A film a liked film suggests in more than one way
// counts once for it. Films you've already tagged, and a liked film suggesting itself, are skipped.
// Then each keyword search counts as one more suggestion for its films, "because" of the liked
// films with that keyword (ADR-0038). Only films whose main genre one of your likes has: a
// keyword crosses genres ("halloween" finds Scooby-Doo, filed under Family first), and the
// explore slots would lift those.
function collectCandidates(input: TasteInput): Map<number, Candidate> {
  const candidates = new Map<number, Candidate>()
  const suggest = (film: ScorerFilm, because: readonly string[]) => {
    const c = candidates.get(film.id) ?? { film, support: 0, because: [] }
    c.support += 1
    for (const title of because) if (!c.because.includes(title)) c.because.push(title)
    candidates.set(film.id, c)
  }
  for (const { film: source, recommendations, similar = [], series = [] } of input.liked) {
    const next = nextInSeries(series, source, input.excluded)
    const alike = similar.filter(
      (f) =>
        f.voteCount >= SIMILAR_MIN_VOTES && f.genreIds.some((g) => source.genreIds.includes(g)),
    )
    const suggested = new Map([...recommendations, ...alike, ...next].map((f) => [f.id, f]))
    for (const film of suggested.values()) {
      if (input.excluded.has(film.id) || film.id === source.id) continue
      suggest(film, [source.title])
    }
  }
  const likedGenres = new Set(input.liked.flatMap((l) => l.film.genreIds))
  for (const { keywordId, films } of input.keywordSearches ?? []) {
    const because = input.liked
      .filter((l) => l.film.keywordIds?.includes(keywordId))
      .map((l) => l.film.title)
    for (const film of films) {
      const primary = film.genreIds[0]
      if (input.excluded.has(film.id) || primary === undefined || !likedGenres.has(primary))
        continue
      suggest(film, because)
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

/**
 * Keyword weights, unscaled: liked +1, Want to see +0.5, disliked −1, from loaded keywords.
 * `keep` leaves films out, so a sequel isn't matched against its own series (ADR-0037).
 */
function keywordProfile(input: TasteTags, keep: (f: ScorerFilm) => boolean): Map<number, number> {
  const weights = new Map<number, number>()
  const add = (films: readonly ScorerFilm[], weight: number) => {
    for (const f of films.filter(keep))
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

// A film's companies without the majors (MAJOR_STUDIOS), which say little about taste.
const indie = (companies: readonly Person[] = []) =>
  companies.filter((c) => !MAJOR_STUDIOS.has(c.id))

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
  // The series of the films you liked, each with the liked film's title.
  const likedBySeries = new Map<number, string>()
  for (const f of likedFilms) if (f.seriesId) likedBySeries.set(f.seriesId, f.title)
  // A candidate's series, from the collection call (series candidates) or its loaded details,
  // when it's the series of a film you liked.
  const likedSeriesOf = (c: Candidate) => {
    const id = c.film.seriesId ?? input.details?.get(c.film.id)?.seriesId
    return id && likedBySeries.has(id) ? id : null
  }
  // What a candidate is compared with: your keyword profile and the directors and writers of
  // your likes. A film in a liked series is compared only with films outside that series, so
  // the series part is the one place it gets credit for being a sequel (ADR-0037). One profile
  // per series (null: everything), built once.
  const profiles = new Map<number | null, ReturnType<typeof profileFor>>()
  function profileFor(series: number | null) {
    const keep = (f: ScorerFilm) => series === null || f.seriesId !== series
    const outside = likedFilms.filter(keep)
    return {
      keywords: keywordProfile(input, keep),
      directors: likedBy(outside, (f) => f.directors ?? []),
      writers: likedBy(outside, (f) => f.writers ?? []),
      cast: likedBy(outside, (f) => f.cast ?? []),
      studios: likedBy(outside, (f) => indie(f.companies)),
    }
  }
  const comparedWith = (c: Candidate) => {
    const series = likedSeriesOf(c)
    const found = profiles.get(series) ?? profileFor(series)
    profiles.set(series, found)
    return found
  }
  // Keywords: how strongly a candidate's keywords overlap your profile (negative counts as 0).
  const keywordRaw = (c: Candidate) => {
    const { keywords } = comparedWith(c)
    return Math.max(
      0,
      (input.details?.get(c.film.id)?.keywordIds ?? []).reduce(
        (sum, k) => sum + (keywords.get(k) ?? 0),
        0,
      ),
    )
  }
  const maxKeywordRaw = Math.max(0, ...candidates.map(keywordRaw))

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
    const credits = comparedWith(c)
    const director = firstShared(details?.directors ?? [], credits.directors)
    const writer = firstShared(details?.writers ?? [], credits.writers)
    const actor = firstShared(details?.cast ?? [], credits.cast)
    const studio = firstShared(indie(details?.companies), credits.studios)
    const seriesId = likedSeriesOf(c)
    const series = seriesId === null ? undefined : likedBySeries.get(seriesId)
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
      keywords: maxKeywordRaw > 0 ? keywordRaw(c) / maxKeywordRaw : 0,
      // All or nothing: a director, writer or series you've already liked, or not.
      director: director ? 1 : 0,
      writer: writer ? 1 : 0,
      series: series ? 1 : 0,
      cast: actor ? 1 : 0,
      studio: studio ? 1 : 0,
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
      ...(actor && { sameCast: { actor: actor.name, liked: actor.liked } }),
      ...(studio && { sameStudio: { studio: studio.name, liked: studio.liked } }),
    }
  })

  return rank(scored, input, likedFilms, profile, diversityPenalty, limit)
}

// Step 4: rank greedily, one pick at a time. Each round takes the best remaining candidate after
// the genre-repeat penalty, from the first of these groups that has one:
// - explore rounds (EXPLORE_SLOTS) first try films whose primary genre no liked film has, a new
//   genre each time, and not one you've disliked;
// - then films that keep the feed spread out (no second film from one series, no more than
//   SERIES_PICKS from the series you liked, no third film by one director, and none next to a
//   pick by the same director);
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
  let seriesPicks = 0
  // Explore picks always have a primary genre (see `exploring`); the type just can't say so.
  const exploredGenres = new Set<number | undefined>()
  const pool = [...scored].sort((a, b) => b.score - a.score || a.film.id - b.film.id)

  // Whether a candidate keeps the feed spread out, given the picks so far.
  const spreadOk = (p: Pick) => {
    const last = picks.at(-1)
    const series = seriesOf(p)
    if (series !== null && (usedSeries.get(series) ?? 0) >= SERIES_CAP) return false
    if (p.sameSeries && seriesPicks >= SERIES_PICKS) return false
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
    if (pick.sameSeries) seriesPicks += 1
    if (explore >= 0) {
      exploredGenres.add(primary)
      pick.explore = true
    }
    picks.push(pick)
  }
  return picks
}
