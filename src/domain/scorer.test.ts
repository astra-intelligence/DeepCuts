// Tests for the recommendation scorer (ADR-0026, ADR-0028, ADR-0032), with small hand-made films:
// each score part, exclusions, series candidates, ranking, spread rules, explore slots, weights
// and determinism, plus v3's similar films, next-in-series and once-only series credit
// (ADR-0037). The scorer must stay at 100% coverage.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WEIGHTS,
  GENERIC_KEYWORDS,
  KEYWORD_SEARCHES,
  keywordsToSearch,
  MAJOR_STUDIOS,
  DIVERSITY_PENALTY,
  EXPLORE_SLOTS,
  normalizeWeights,
  recommend,
  SCORE_PARTS,
  SERIES_PICKS,
  SIMILAR_MIN_VOTES,
  type Pick,
  type ScorerFilm,
  type TasteInput,
} from './scorer'

const HORROR = 27
const SCIFI = 878
const COMEDY = 35
const DRAMA = 18
const WESTERN = 37
const MUSIC = 10402

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

const ZERO = {
  support: 0,
  genre: 0,
  quality: 0,
  deepCut: 0,
  decade: 0,
  language: 0,
  keywords: 0,
  director: 0,
  writer: 0,
  series: 0,
  cast: 0,
  studio: 0,
}

function input(overrides: Partial<TasteInput> = {}): TasteInput {
  return { liked: [], wanted: [], disliked: [], excluded: new Set(), ...overrides }
}

describe('recommend (ADR-0026)', () => {
  it('weights sum to 1, so scores stay between 0 and 1', () => {
    const total = SCORE_PARTS.reduce((s, p) => s + DEFAULT_WEIGHTS[p], 0)
    expect(total).toBeCloseTo(1, 10)
  })

  it('uses the v3 weights the owner tuned, plus cast and studio (ADR-0037, ADR-0038)', () => {
    const shown = Object.fromEntries(
      SCORE_PARTS.map((p) => [p, Math.round(DEFAULT_WEIGHTS[p] * 100)]),
    )
    expect(shown).toEqual({
      support: 15,
      genre: 15,
      quality: 13,
      deepCut: 10,
      decade: 8,
      language: 5,
      keywords: 7,
      director: 7,
      writer: 5,
      series: 6,
      cast: 5,
      studio: 4,
    })
    expect(DIVERSITY_PENALTY).toBe(0.03)
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
    // Disliked comedy is −1 (the largest weight) but only falls to the 0.25 floor, never 0
    // (ADR-0032); Want to see drama scales to +0.5.
    expect(picks[1]?.parts.genre).toBe(0.25)
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
    expect(normalizeWeights(DEFAULT_WEIGHTS).support).toBeCloseTo(DEFAULT_WEIGHTS.support)
  })

  it('scores keyword overlap against liked, wanted and disliked keywords (ADR-0028)', () => {
    const CABIN = 1
    const SNOW = 2
    const SPACE = 3
    const liked = film({ keywordIds: [CABIN, SNOW] })
    const close = film()
    const partial = film()
    const opposite = film()
    const unknown = film()
    const picks = recommend(
      input({
        liked: [{ film: liked, recommendations: [close, partial, opposite, unknown] }],
        disliked: [film({ keywordIds: [SPACE] })],
        details: new Map([
          [close.id, { keywordIds: [CABIN, SNOW], directors: [] }],
          [partial.id, { keywordIds: [CABIN, 99], directors: [] }],
          [opposite.id, { keywordIds: [SPACE], directors: [] }],
        ]),
      }),
    )
    expect(pickOf(picks, close.id).parts.keywords).toBe(1)
    expect(pickOf(picks, partial.id).parts.keywords).toBe(0.5)
    // A disliked keyword never goes below zero; no loaded details scores zero.
    expect(pickOf(picks, opposite.id).parts.keywords).toBe(0)
    expect(pickOf(picks, unknown.id).parts.keywords).toBe(0)
  })

  it('scores a shared director and says who and which liked film (ADR-0028)', () => {
    const carpenter = { id: 11770, name: 'John Carpenter' }
    const liked = film({ title: 'The Thing', directors: [carpenter] })
    const same = film()
    const other = film()
    const picks = recommend(
      input({
        liked: [{ film: liked, recommendations: [same, other] }],
        details: new Map([
          [same.id, { keywordIds: [], directors: [{ id: 1, name: 'Someone' }, carpenter] }],
          [other.id, { keywordIds: [], directors: [{ id: 2, name: 'Someone Else' }] }],
        ]),
      }),
    )
    expect(pickOf(picks, same.id).parts.director).toBe(1)
    expect(pickOf(picks, same.id).sameDirector).toEqual({
      director: 'John Carpenter',
      liked: 'The Thing',
    })
    expect(pickOf(picks, other.id).parts.director).toBe(0)
    expect(pickOf(picks, other.id).sameDirector).toBeUndefined()
  })

  it('without details, ranks exactly as v1 did (the re-rank only adds to the top candidates)', () => {
    const recs = Array.from({ length: 8 }, (_, i) =>
      film({ popularity: 5 + i * 40, voteAverage: 6 + i * 0.3 }),
    )
    const taste = input({ liked: [{ film: film(), recommendations: recs }] })
    const v1Only = normalizeWeights({
      ...DEFAULT_WEIGHTS,
      keywords: 0,
      director: 0,
      writer: 0,
      series: 0,
    })
    expect(recommend(taste).map((p) => p.film.id)).toEqual(
      recommend(taste, { weights: v1Only }).map((p) => p.film.id),
    )
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

describe('scorer v2 (ADR-0032)', () => {
  const carpenter = { id: 11770, name: 'John Carpenter' }
  const hill = { id: 9, name: 'Debra Hill' }

  it('adds the next film you haven’t tagged from a liked film’s series, and scores the series part', () => {
    const F13 = 9735
    const original = film({ title: 'Friday the 13th', seriesId: F13, year: 1980 })
    // TMDB's order isn't release order, so the series is listed out of order on purpose.
    const part3 = film({ title: 'Part III', seriesId: F13, year: 1982 })
    const part2 = film({ title: 'Part 2', seriesId: F13, year: 1981 })
    const undated = film({ title: 'Announced', seriesId: F13, year: null })
    const undated2 = film({ title: 'Also announced', seriesId: F13, year: null })
    const unrelated = film()
    const liked = (excluded: number[]) =>
      recommend(
        input({
          liked: [
            {
              film: original,
              recommendations: [unrelated],
              series: [original, undated2, undated, part3, part2],
            },
          ],
          excluded: new Set(excluded),
        }),
      )
    const picks = liked([original.id])
    expect(pickOf(picks, part2.id)).toMatchObject({
      because: ['Friday the 13th'],
      sameSeries: { liked: 'Friday the 13th' },
    })
    expect(pickOf(picks, part2.id).parts).toMatchObject({ series: 1, support: 1 })
    // Only the next film comes in: not Part III, nor the undated one, nor the liked film itself.
    expect(picks.map((p) => p.film.id).sort()).toEqual([part2.id, unrelated.id].sort())
    expect(pickOf(picks, unrelated.id).parts.series).toBe(0)
    expect(pickOf(picks, unrelated.id).sameSeries).toBeUndefined()
    // Tag Part 2 and Part III is next; tag that too and the undated films are last, by id.
    expect(liked([original.id, part2.id]).some((p) => p.film.id === part3.id)).toBe(true)
    const last = liked([original.id, part2.id, part3.id]).map((p) => p.film.id)
    expect(last).toContain(undated.id)
    expect(last).not.toContain(undated2.id)
  })

  it('knows a candidate’s series from its loaded details too', () => {
    const liked = film({ title: 'Alien', seriesId: 8091 })
    const aliens = film()
    const [pick] = recommend(
      input({
        liked: [{ film: liked, recommendations: [aliens] }],
        details: new Map([[aliens.id, { keywordIds: [], directors: [], seriesId: 8091 }]]),
      }),
    )
    expect(pick?.sameSeries).toEqual({ liked: 'Alien' })
  })

  it('scores a shared writer and says who and which liked film', () => {
    const liked = film({ title: 'Halloween', writers: [carpenter, hill] })
    const same = film()
    const other = film()
    const picks = recommend(
      input({
        liked: [{ film: liked, recommendations: [same, other] }],
        details: new Map([
          [same.id, { keywordIds: [], directors: [], writers: [hill] }],
          [other.id, { keywordIds: [], directors: [] }],
        ]),
      }),
    )
    expect(pickOf(picks, same.id).parts.writer).toBe(1)
    expect(pickOf(picks, same.id).sameWriter).toEqual({ writer: 'Debra Hill', liked: 'Halloween' })
    expect(pickOf(picks, other.id).parts.writer).toBe(0)
    expect(pickOf(picks, other.id).sameWriter).toBeUndefined()
  })

  it('takes one film per series, and only relaxes that when nothing else is left', () => {
    const S = 1
    const series = Array.from({ length: 3 }, (_, i) =>
      film({ seriesId: S, voteAverage: 9 - i * 0.01, popularity: 1 }),
    )
    const others = Array.from({ length: 2 }, () => film({ voteAverage: 5, popularity: 50 }))
    const picks = recommend(
      input({ liked: [{ film: film(), recommendations: [...series, ...others] }] }),
      { diversityPenalty: 0 },
    )
    const inSeries = picks.map((p) => p.film.seriesId === S)
    expect(inSeries).toEqual([true, false, false, true, true])
  })

  it('takes at most SERIES_PICKS films from the series you liked (ADR-0037)', () => {
    // Five liked films from five series, each bringing its next film, which outscore the rest.
    const liked = Array.from({ length: 5 }, (_, i) => {
      const seriesId = 100 + i
      const original = film({ seriesId, year: 1980 })
      const next = film({ seriesId, year: 1981, voteAverage: 9, popularity: 1 })
      // The first liked film also recommends four weaker films outside any series.
      const others =
        i === 0 ? Array.from({ length: 4 }, () => film({ voteAverage: 5, popularity: 50 })) : []
      return { film: original, recommendations: others, series: [original, next] }
    })
    const picks = recommend(input({ liked, excluded: new Set(liked.map((l) => l.film.id)) }), {
      diversityPenalty: 0,
    })
    const sequels = picks.map((p) => p.sameSeries !== undefined)
    expect(SERIES_PICKS).toBe(3)
    // Three sequels lead, then the other films, then the last two sequels as the rules relax.
    expect(sequels).toEqual([true, true, true, false, false, false, false, true, true])
  })

  it('credits a sequel once: director, writer and keywords count only outside its series (ADR-0037)', () => {
    const S = 7
    const original = film({
      title: 'Halloween',
      seriesId: S,
      year: 1978,
      directors: [carpenter],
      writers: [hill],
      keywordIds: [1, 2],
    })
    const sequel = film({ seriesId: S, year: 1981 })
    const outsider = film()
    const details = new Map([
      [sequel.id, { keywordIds: [1, 2], directors: [carpenter], writers: [hill], seriesId: S }],
      [outsider.id, { keywordIds: [1], directors: [carpenter], writers: [hill] }],
    ])
    const picks = recommend(
      input({
        liked: [{ film: original, recommendations: [outsider], series: [original, sequel] }],
        excluded: new Set([original.id]),
        details,
      }),
    )
    expect(pickOf(picks, sequel.id).parts).toMatchObject({
      series: 1,
      director: 0,
      writer: 0,
      keywords: 0,
    })
    expect(pickOf(picks, sequel.id).sameDirector).toBeUndefined()
    // A film outside the series still gets credit for the same director, writer and keywords.
    expect(pickOf(picks, outsider.id).parts).toMatchObject({
      series: 0,
      director: 1,
      writer: 1,
      keywords: 1,
    })

    // Liking another Carpenter film outside the series does credit the sequel's director.
    const fog = film({ title: 'The Fog', directors: [carpenter] })
    const withFog = recommend(
      input({
        liked: [
          { film: original, recommendations: [], series: [original, sequel] },
          { film: fog, recommendations: [] },
        ],
        excluded: new Set([original.id, fog.id]),
        details,
      }),
    )
    expect(pickOf(withFog, sequel.id).sameDirector).toEqual({
      director: 'John Carpenter',
      liked: 'The Fog',
    })
  })

  it('adds the films TMDB lists as similar, counting a film once per liked film (ADR-0037)', () => {
    const shared = film()
    const onlySimilar = film()
    const picks = recommend(
      input({
        liked: [
          { film: film({ title: 'A' }), recommendations: [shared], similar: [shared, onlySimilar] },
          { film: film({ title: 'B' }), recommendations: [], similar: [shared] },
        ],
      }),
    )
    expect(pickOf(picks, shared.id).because).toEqual(['A', 'B'])
    expect(pickOf(picks, shared.id).parts.support).toBe(1)
    expect(pickOf(picks, onlySimilar.id).parts.support).toBe(0.5)
  })

  it('skips similar films with too few votes or no genre in common (ADR-0037)', () => {
    const kept = film({ genreIds: [DRAMA, HORROR], voteCount: SIMILAR_MIN_VOTES })
    const fewVotes = film({ voteCount: SIMILAR_MIN_VOTES - 1 })
    const otherGenre = film({ genreIds: [COMEDY] })
    const picks = recommend(
      input({
        liked: [
          {
            film: film({ genreIds: [HORROR] }),
            recommendations: [],
            similar: [kept, fewVotes, otherGenre],
          },
        ],
      }),
    )
    expect(picks.map((p) => p.film.id)).toEqual([kept.id])
  })

  it('spreads a director the same way, using loaded details', () => {
    const byCarpenter = Array.from({ length: 3 }, (_, i) =>
      film({ voteAverage: 9 - i * 0.01, popularity: 1 }),
    )
    const other = film({ voteAverage: 5, popularity: 50 })
    const picks = recommend(
      input({
        liked: [{ film: film(), recommendations: [...byCarpenter, other] }],
        details: new Map(
          byCarpenter.map((f) => [f.id, { keywordIds: [], directors: [carpenter] }] as const),
        ),
      }),
      { diversityPenalty: 0 },
    )
    expect(picks.map((p) => p.film.id)).toEqual([
      byCarpenter[0]?.id,
      other.id,
      byCarpenter[1]?.id,
      // A third Carpenter film breaks the cap, but it's all that's left, so it still comes.
      byCarpenter[2]?.id,
    ])
  })

  it('gives explore slots to genres no liked film has, a new genre each time', () => {
    // 20 horror films that outscore everything, plus three outside your genres.
    const horror = Array.from({ length: 20 }, () => film({ genreIds: [HORROR], voteAverage: 9 }))
    const western = film({ genreIds: [WESTERN], voteAverage: 5 })
    const western2 = film({ genreIds: [WESTERN], voteAverage: 5 })
    const music = film({ genreIds: [MUSIC], voteAverage: 5 })
    const picks = recommend(
      input({
        liked: [
          {
            film: film({ genreIds: [HORROR] }),
            recommendations: [...horror, western, western2, music],
          },
        ],
      }),
      { diversityPenalty: 0 },
    )
    const [first, second, third] = EXPLORE_SLOTS as [number, number, number]
    const explored = [picks[first], picks[second]].map((p) => p?.film.genreIds[0])
    expect(new Set(explored)).toEqual(new Set([WESTERN, MUSIC]))
    expect(picks[first]?.explore).toBe(true)
    // With both new genres used, the third slot falls back to the best remaining film.
    expect(picks[third]?.explore).toBeUndefined()
    expect(picks[third]?.film.genreIds[0]).toBe(HORROR)
    expect(picks.filter((p) => p.explore)).toHaveLength(2)
  })

  it('doesn’t explore a genre you’ve disliked', () => {
    const horror = Array.from({ length: 8 }, () => film({ genreIds: [HORROR], voteAverage: 9 }))
    const comedy = film({ genreIds: [COMEDY], voteAverage: 5 })
    const picks = recommend(
      input({
        liked: [{ film: film({ genreIds: [HORROR] }), recommendations: [...horror, comedy] }],
        disliked: [film({ genreIds: [COMEDY] })],
      }),
      { diversityPenalty: 0 },
    )
    expect(picks.some((p) => p.explore)).toBe(false)
    // Still in the feed, just not lifted into an explore slot.
    expect(picks.at(-1)?.film.id).toBe(comedy.id)
  })
})

describe('cast, studio and keyword searches (ADR-0038)', () => {
  const russell = { id: 6856, name: 'Kurt Russell' }
  const hammer = { id: 1314, name: 'Hammer Films' }
  const universal = { id: 33, name: 'Universal Pictures' }

  it('scores a shared top-billed actor, but not one a sequel shares with its own series', () => {
    const S = 3
    const liked = film({ title: 'Escape from New York', seriesId: S, cast: [russell] })
    const sequel = film({ seriesId: S, year: 1996 })
    const thing = film()
    const other = film()
    const picks = recommend(
      input({
        liked: [{ film: liked, recommendations: [thing, other], series: [liked, sequel] }],
        excluded: new Set([liked.id]),
        details: new Map([
          [thing.id, { keywordIds: [], directors: [], cast: [russell] }],
          [other.id, { keywordIds: [], directors: [] }],
          [sequel.id, { keywordIds: [], directors: [], cast: [russell], seriesId: S }],
        ]),
      }),
    )
    expect(pickOf(picks, thing.id).parts.cast).toBe(1)
    expect(pickOf(picks, thing.id).sameCast).toEqual({
      actor: 'Kurt Russell',
      liked: 'Escape from New York',
    })
    expect(pickOf(picks, other.id).parts.cast).toBe(0)
    expect(pickOf(picks, other.id).sameCast).toBeUndefined()
    expect(pickOf(picks, sequel.id).parts.cast).toBe(0)
  })

  it('scores a shared studio, ignoring the majors', () => {
    expect(MAJOR_STUDIOS.has(universal.id)).toBe(true)
    const liked = film({ title: 'Dracula', companies: [hammer, universal] })
    const hammerFilm = film()
    const universalFilm = film()
    const picks = recommend(
      input({
        liked: [{ film: liked, recommendations: [hammerFilm, universalFilm] }],
        details: new Map([
          [hammerFilm.id, { keywordIds: [], directors: [], companies: [hammer] }],
          [universalFilm.id, { keywordIds: [], directors: [], companies: [universal] }],
        ]),
      }),
    )
    expect(pickOf(picks, hammerFilm.id).parts.studio).toBe(1)
    expect(pickOf(picks, hammerFilm.id).sameStudio).toEqual({
      studio: 'Hammer Films',
      liked: 'Dracula',
    })
    expect(pickOf(picks, universalFilm.id).parts.studio).toBe(0)
    expect(pickOf(picks, universalFilm.id).sameStudio).toBeUndefined()
  })

  it('searches the keywords your likes share most, strongest first, skipping general ones', () => {
    const SLASHER = 12339
    const CABIN = 3616
    const MASK = 1701
    const ONCE = 500
    const NOVEL = 818
    expect(GENERIC_KEYWORDS.has(NOVEL)).toBe(true)
    const like = (keywordIds: number[]) => ({ film: film({ keywordIds }), recommendations: [] })
    const tags = {
      liked: [
        like([SLASHER, CABIN, MASK, ONCE, NOVEL]),
        like([SLASHER, CABIN, MASK, NOVEL]),
        like([SLASHER, MASK, NOVEL]),
      ],
      wanted: [],
      // A dislike takes one off: MASK drops from 3 to 2, ties CABIN, and comes first on id.
      disliked: [film({ keywordIds: [MASK] })],
    }
    expect(KEYWORD_SEARCHES).toBe(3)
    // NOVEL is general and ONCE is in only one like, so neither is searched.
    expect(keywordsToSearch(tags)).toEqual([SLASHER, MASK, CABIN])
  })

  it('adds keyword search results in your genres as candidates, because of the likes with that keyword', () => {
    const SLASHER = 12339
    const halloween = film({ title: 'Halloween', keywordIds: [SLASHER] })
    const scream = film({ title: 'Scream', keywordIds: [SLASHER] })
    const alien = film({ title: 'Alien' })
    const blackChristmas = film()
    const tagged = film()
    // Horror is in its genres, but it's filed under Family first: not one of your likes' genres.
    const scooby = film({ genreIds: [10751, HORROR] })
    const noGenres = film({ genreIds: [] })
    const picks = recommend(
      input({
        liked: [
          { film: halloween, recommendations: [blackChristmas] },
          { film: scream, recommendations: [] },
          { film: alien, recommendations: [] },
        ],
        keywordSearches: [
          { keywordId: SLASHER, films: [blackChristmas, tagged, scooby, noGenres] },
        ],
        excluded: new Set([tagged.id]),
      }),
    )
    // Recommended by Halloween and found by the search: two suggestions.
    expect(pickOf(picks, blackChristmas.id)).toMatchObject({
      because: ['Halloween', 'Scream'],
      parts: { support: 1 },
    })
    expect(picks.map((p) => p.film.id)).toEqual([blackChristmas.id])
  })
})
