// @vitest-environment node
// Tests for the parts of the proxy core the contract suite doesn't cover: trimming credits, the
// edge cache (ADR-0029, Stage 4 H5) and its time-to-live per endpoint.
import { describe, expect, it, vi } from 'vitest'
import { edgeTtl, handleTmdb, trimCredits } from './tmdbCore'

// An in-memory stand-in for Cloudflare's `caches.default`, keyed by URL.
function fakeCache() {
  const store = new Map<string, Response>()
  return {
    store,
    match: vi.fn(async (req: Request) => store.get(req.url)?.clone()),
    put: vi.fn(async (req: Request, res: Response) => void store.set(req.url, res)),
  }
}

const get = (path: string) => new Request(`https://deep-cuts.pages.dev${path}`)

describe('edge cache (Stage 4 H5)', () => {
  it('stores a success under the upstream URL, without the token, and serves it next time', async () => {
    const cache = fakeCache()
    const fetchImpl = vi.fn(async () => Response.json({ genres: [] }))
    const opts = { cache: cache as unknown as Cache, fetchImpl: fetchImpl as typeof fetch }

    const first = await handleTmdb(get('/api/tmdb/genre/movie/list'), 'secret-token', opts)
    expect(first.status).toBe(200)
    const [key] = [...cache.store.keys()]
    expect(key).toBe('https://api.themoviedb.org/3/genre/movie/list?')
    expect(key).not.toContain('secret-token')
    expect(cache.store.get(key)?.headers.get('Cache-Control')).toBe('public, max-age=86400')

    const second = await handleTmdb(get('/api/tmdb/genre/movie/list'), 'secret-token', opts)
    expect(await second.json()).toEqual({ genres: [] })
    // Served from the cache, but with the browser's usual private header, not the edge one.
    expect(second.headers.get('Cache-Control')).toBe('private, max-age=300')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('never caches errors', async () => {
    const cache = fakeCache()
    await handleTmdb(get('/api/tmdb/movie/1'), 't', {
      cache: cache as unknown as Cache,
      fetchImpl: (async () => new Response('{}', { status: 500 })) as typeof fetch,
    })
    await handleTmdb(get('/api/tmdb/account'), 't', { cache: cache as unknown as Cache })
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('treats a broken cache as a miss instead of failing the request', async () => {
    const broken = {
      match: async () => Promise.reject(new Error('down')),
      put: async () => Promise.reject(new Error('down')),
    }
    const res = await handleTmdb(get('/api/tmdb/movie/1'), 't', {
      cache: broken as unknown as Cache,
      fetchImpl: (async () => Response.json({ id: 1 })) as typeof fetch,
    })
    expect(res.status).toBe(200)
  })

  it('keeps lists for an hour and everything else for a day, like the client', () => {
    expect(edgeTtl('search/movie')).toBe(3600)
    expect(edgeTtl('discover/movie')).toBe(3600)
    expect(edgeTtl('movie/603')).toBe(86400)
    expect(edgeTtl('movie/603/watch/providers')).toBe(86400)
    expect(edgeTtl('genre/movie/list')).toBe(86400)
  })
})

describe('handleTmdb', () => {
  it('answers paths outside the proxy prefix with 404', async () => {
    expect((await handleTmdb(get('/api/other'), 't')).status).toBe(404)
  })
})

describe('trimCredits (ADR-0028)', () => {
  it('keeps only directors and writers from appended credits, and drops the cast', () => {
    const body = {
      id: 1091,
      title: 'The Thing',
      credits: {
        cast: [{ id: 1, name: 'Kurt Russell' }],
        crew: [
          { id: 11770, name: 'John Carpenter', job: 'Director', department: 'Directing' },
          { id: 2, name: 'Dean Cundey', job: 'Director of Photography' },
          { id: 3, name: 'Bill Lancaster', job: 'Screenplay', department: 'Writing' },
          { id: 4, name: 'John W. Campbell Jr.', job: 'Novel', department: 'Writing' },
          null,
        ],
      },
    }
    expect(trimCredits(body)).toEqual({
      id: 1091,
      title: 'The Thing',
      credits: {
        crew: [
          { id: 11770, name: 'John Carpenter', job: 'Director' },
          { id: 3, name: 'Bill Lancaster', job: 'Screenplay' },
        ],
      },
    })
  })

  it('passes other bodies through unchanged, and empties malformed credits', () => {
    const search = { page: 1, results: [] }
    expect(trimCredits(search)).toBe(search)
    expect(trimCredits(null)).toBeNull()
    expect(trimCredits({ credits: 'odd' })).toEqual({ credits: { crew: [] } })
  })
})
