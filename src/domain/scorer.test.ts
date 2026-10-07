import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WEIGHTS,
  normalizeWeights,
  recommend,
  SCORE_PARTS,
  type Pick,
  type ScorerFilm,
  type TasteInput,
} from './scorer'

const HORROR = 27
const SCIFI = 878
const COMEDY = 35
const DRAMA = 18

let nextId = 1000
function film(overrides: Partial<ScorerFilm> = {}): ScorerFilm {
  return {
    id: nextId++,
    title: `Film ${nextId}`,
    genreIds: [HORROR],
    year: 1982,
    language: 'en',
    popularity: 10,
    voteAverage: 7,
    voteCount: 1000,
    ...overrides,
  }
}

/** The pick for a film id; fails the test if it's missing. */
function pickOf(picks: Pick[], id: number): Pick {
  const pick = picks.find((p) => p.film.id === id)
  if (!pick) throw new Error(`no pick for film ${id}`)
  return pick
}

const ZERO = { support: 0, genre: 0, quality: 0, deepCut: 0, decade: 0, language: 0 }

function input(overrides: Partial<TasteInput> = {}): TasteInput {
  return { liked: [], wanted: [], disliked: [], excluded: new Set(), ...overrides }
}

describe('recommend (ADR-0026)', () => {
  it('weights sum to 1, so scores stay between 0 and 1', () => {
    const total = SCORE_PARTS.reduce((s, p) => s + DEFAULT_WEIGHTS[p], 0)
    expect(total).toBeCloseTo(1)
  })

  it('returns nothing without likes', () => {
    expect(recommend(input())).toEqual([])
  })

  it('ranks films recommended by more of your likes higher, and says which likes', () => {
    const shared = film({ title: 'Shared' })
    const single = film({ title: 'Single' })
    const a = film({ title: 'Alien' })
    const b = film({ title: 'The Thing' })
    const picks = recommend(
      input({
        liked: [
          { film: a, recommendations: [shared, single] },
          { film: b, recommendations: [shared] },
        ],
      }),
    )
    expect(picks.map((p) => p.film.title)).toEqual(['Shared', 'Single'])
    expect(picks[0]?.because).toEqual(['Alien', 'The Thing'])
    expect(picks[0]?.parts.support).toBe(1)
    expect(picks[1]?.parts.support).toBe(0.5)
  })

  it('never recommends a tagged film, or a liked film to itself', () => {
    const liked = film()
    const tagged = film()
    const fresh = film()
    const picks = recommend(
      input({
        liked: [{ film: liked, recommendations: [liked, tagged, fresh] }],
        excluded: new Set([liked.id, tagged.id]),
      }),
    )
    expect(picks.map((p) => p.film.id)).toEqual([fresh.id])
  })

  it('lowers films in disliked genres and raises Want to see genres', () => {
    const comedy = film({ genreIds: [COMEDY] })
    const drama = film({ genreIds: [DRAMA] })
    const base = { liked: [{ film: film({ genreIds: [] }), recommendations: [comedy, drama] }] }
    const picks = recommend(
      input({
        ...base,
        disliked: [film({ genreIds: [COMEDY] })],
        wanted: [film({ genreIds: [DRAMA] })],
      }),
    )
    expect(picks.map((p) => p.film.id)).toEqual([drama.id, comedy.id])
    // Disliked comedy is −1 (the largest weight); Want to see drama scales to +0.5.
    expect(picks[1]?.parts.genre).toBe(0)
    expect(picks[0]?.parts.genre).toBe(0.75)
  })

  it('is neutral when a genre is both liked and disliked, or unknown to your profile', () => {
    const horror = film({ genreIds: [HORROR] })
    const unknown = film({ genreIds: [COMEDY] })
    const picks = recommend(
      input({
        liked: [{ film: film({ genreIds: [HORROR] }), recommendations: [horror, unknown] }],
        disliked: [film({ genreIds: [HORROR] })],
      }),
    )
    expect(pickOf(picks, horror.id).parts.genre).toBe(0.5)
    expect(pickOf(picks, unknown.id).parts.genre).toBe(0.5)
  })

  it('treats a film with no genres as neutral on genre fit', () => {
    const none = film({ genreIds: [] })
    const [pick] = recommend(input({ liked: [{ film: film(), recommendations: [none] }] }))
    expect(pick?.parts.genre).toBe(0.5)
  })

  it('favors lesser-known films (deep cut) and handles zero popularity', () => {
    const famous = film({ popularity: 500 })
    const obscure = film({ popularity: 2 })
    const picks = recommend(
      input({ liked: [{ film: film(), recommendations: [famous, obscure] }] }),
    )
    expect(pickOf(picks, famous.id).parts.deepCut).toBe(0)
    expect(pickOf(picks, obscure.id).parts.deepCut).toBeGreaterThan(0.8)

    const unknown = recommend(
      input({ liked: [{ film: film(), recommendations: [film({ popularity: 0 })] }] }),
    )
    expect(unknown[0]?.parts.deepCut).toBe(0.5)
  })

  it('shrinks ratings with few votes toward the average', () => {
    const hyped = film({ voteAverage: 10, voteCount: 3 })
    const proven = film({ voteAverage: 8.5, voteCount: 5000 })
    const picks = recommend(input({ liked: [{ film: film(), recommendations: [hyped, proven] }] }))
    expect(pickOf(picks, proven.id).parts.quality).toBeGreaterThan(
      pickOf(picks, hyped.id).parts.quality,
    )
  })

  it('matches decade and language against your likes, with unknowns scoring zero', () => {
    const liked = film({ year: 1984, language: 'en' })
    const same = film({ year: 1989, language: 'en' })
    const other = film({ year: 2015, language: 'ko' })
    const unknown = film({ year: null, language: '' })
    const picks = recommend(
      input({ liked: [{ film: liked, recommendations: [same, other, unknown] }] }),
    )
    const byId = new Map(picks.map((p) => [p.film.id, p.parts]))
    expect(byId.get(same.id)).toMatchObject({ decade: 1, language: 1 })
    expect(byId.get(other.id)).toMatchObject({ decade: 0, language: 0 })
    expect(byId.get(unknown.id)).toMatchObject({ decade: 0, language: 0 })
  })

  it('shows match as the score in percent, without inflation', () => {
    const [pick] = recommend(input({ liked: [{ film: film(), recommendations: [film()] }] }))
    expect(pick?.match).toBe(Math.round((pick?.score ?? -1) * 100))
  })

  it('spreads genres: an equal-scoring film in a new genre beats a third of the same genre', () => {
    const h1 = film({ genreIds: [HORROR] })
    const h2 = film({ genreIds: [HORROR] })
    const h3 = film({ genreIds: [HORROR] })
    const s1 = film({ genreIds: [SCIFI] })
    const genreless = film({ genreIds: [] })
    const liked = film({ genreIds: [HORROR, SCIFI] })
    const picks = recommend(
      input({ liked: [{ film: liked, recommendations: [h1, h2, h3, s1, genreless] }] }),
    )
    const order = picks.map((p) => p.film.id)
    expect(order.indexOf(s1.id)).toBeLessThan(order.indexOf(h3.id))
  })

  it('turns diversity off with a zero penalty', () => {
    const h1 = film({ genreIds: [HORROR], voteAverage: 8 })
    const h2 = film({ genreIds: [HORROR], voteAverage: 8 })
    const s1 = film({ genreIds: [SCIFI], voteAverage: 7.9 })
    const taste = input({
      liked: [{ film: film({ genreIds: [HORROR, SCIFI] }), recommendations: [h1, h2, s1] }],
    })
    const ids = (penalty: number) =>
      recommend(taste, { diversityPenalty: penalty }).map((p) => p.film.id)
    expect(ids(0)).toEqual([h1.id, h2.id, s1.id])
    expect(ids(0.5)).toEqual([h1.id, s1.id, h2.id])
  })

  it('ranks by whichever weights it is given', () => {
    const famous = film({ popularity: 500, voteAverage: 8.5 })
    const obscure = film({ popularity: 1, voteAverage: 6 })
    const taste = input({ liked: [{ film: film(), recommendations: [famous, obscure] }] })
    const only = (part: 'quality' | 'deepCut') =>
      recommend(taste, {
        weights: normalizeWeights({ ...ZERO, [part]: 1 }),
      }).map((p) => p.film.id)
    expect(only('quality')).toEqual([famous.id, obscure.id])
    expect(only('deepCut')).toEqual([obscure.id, famous.id])
  })

  it('normalizes weights to sum to 1, ignoring negatives, and keeps all-zero at zero', () => {
    const w = normalizeWeights({ ...ZERO, support: 3, genre: 1, quality: -2 })
    expect(w).toEqual({ ...ZERO, support: 0.75, genre: 0.25 })
    expect(normalizeWeights(ZERO)).toEqual(ZERO)
    expect(normalizeWeights(DEFAULT_WEIGHTS).support).toBeCloseTo(0.35)
  })

  it('stops at the limit', () => {
    const recs = Array.from({ length: 30 }, () => film())
    expect(
      recommend(input({ liked: [{ film: film(), recommendations: recs }] }), { limit: 5 }),
    ).toHaveLength(5)
  })

  it('is deterministic: the same input gives the same order', () => {
    const recs = Array.from({ length: 10 }, (_, i) =>
      film({ popularity: 10, voteCount: 1000 + 0 * i }),
    )
    const taste = input({ liked: [{ film: film(), recommendations: recs }] })
    expect(recommend(taste).map((p) => p.film.id)).toEqual(recommend(taste).map((p) => p.film.id))
  })
})
