// Tests for the TMDB client: responses are validated (bad ones rejected, odd image paths
// dropped), errors carry the status, and the helpers (image URLs, providers, certification,
// discover parameters) behave.
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { movieFixture } from '../test/msw/fixtures'
import { server } from '../test/msw/server'
import {
  certification,
  formatRuntime,
  imageUrl,
  movieDetailSchema,
  providersFor,
  releaseYear,
  tmdb,
  TmdbError,
  watchProvidersSchema,
} from './tmdb'
import { providersFixture } from '../test/msw/fixtures'

describe('tmdb client', () => {
  it('validates and returns search results', async () => {
    const r = await tmdb.search('thing')
    expect(r.results.map((m) => m.title)).toEqual(['The Thing'])
  })

  it('throws TmdbError with the proxy status', async () => {
    await expect(tmdb.movie(999)).rejects.toEqual(new TmdbError(404))
  })

  it('rejects responses that do not match the schema', async () => {
    server.use(http.get('/api/tmdb/movie/:id', () => HttpResponse.json({ id: 'nope' })))
    await expect(tmdb.movie(1)).rejects.toThrow()
  })

  it('drops image paths that are not plain TMDB file names', async () => {
    server.use(
      http.get('/api/tmdb/movie/:id', () =>
        HttpResponse.json({
          id: 1,
          title: 'X',
          poster_path: '//evil.example/x.jpg',
          backdrop_path: '/ok.jpg',
        }),
      ),
    )
    const m = await tmdb.movie(1)
    expect(m.poster_path).toBeNull()
    expect(m.backdrop_path).toBe('/ok.jpg')
  })
})

describe('helpers', () => {
  it('builds CDN image URLs only for present paths', () => {
    expect(imageUrl('/a.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/a.jpg')
    expect(imageUrl(null, 'w342')).toBeNull()
  })

  it.each([
    ['1982-06-25', '1982'],
    ['', ''],
    ['TBA', ''],
  ])('releaseYear(%s) = %s', (d, y) => expect(releaseYear(d)).toBe(y))

  it.each([
    [109, '1h 49m'],
    [45, '45m'],
    [null, ''],
    [0, ''],
  ])('formatRuntime(%s) = %s', (m, s) => expect(formatRuntime(m)).toBe(s))

  it('lists subscription providers first without duplicates', () => {
    const data = watchProvidersSchema.parse(providersFixture)
    expect(providersFor(data, 'US').map((p) => p.provider_name)).toEqual([
      'Disney Plus',
      'Apple TV',
    ])
    expect(providersFor(data, 'GB')).toEqual([])
  })
})

describe('certification', () => {
  it('picks the first non-empty rating for the region', () => {
    const movie = movieDetailSchema.parse(movieFixture)
    expect(certification(movie, 'US')).toBe('R')
    expect(certification(movie, 'FR')).toBe('')
  })

  it('tolerates a malformed release_dates block', () => {
    const movie = movieDetailSchema.parse({ ...movieFixture, release_dates: { results: 'nope' } })
    expect(certification(movie, 'US')).toBe('')
  })
})

describe('discover', () => {
  it('asks the allowlisted endpoint for popular films in any of the genres', async () => {
    let url: URL | undefined
    server.use(
      http.get('/api/tmdb/discover/movie', ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ page: 1, total_pages: 1, total_results: 0, results: [] })
      }),
    )
    await tmdb.discover([27, 53])
    expect(url?.searchParams.get('with_genres')).toBe('27|53')
    expect(url?.searchParams.get('sort_by')).toBe('popularity.desc')
    await tmdb.discover([])
    expect(url?.searchParams.has('with_genres')).toBe(false)
  })
})
