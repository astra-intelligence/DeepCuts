// @vitest-environment node
// Tests for the TMDB proxy as a Cloudflare Pages Function (functions/api/tmdb/[[path]].ts,
// ADR-0029): it passes the same contract as the local proxy, and applies the rate limit first.
// The Workers globals it uses (`caches.default`, `fetch`) are replaced with fakes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onRequest as apiCatchAll } from '../functions/api/[[path]]'
import { onRequest, type Env } from '../functions/api/tmdb/[[path]]'
import { onRequest as middleware } from '../functions/_middleware'
import { productionHeaders } from './securityHeaders'
import { tmdbProxyContract } from './tmdbProxy.contract'

// A cache that never hits, so the contract sees the uncached behavior.
const emptyCache = { match: async () => undefined, put: async () => undefined }

beforeEach(() => vi.stubGlobal('caches', { default: emptyCache }))
afterEach(() => vi.unstubAllGlobals())

// Calls the Function the way Pages does, with only the context fields it reads.
async function viaFunction(url: string, method: string, env: Env, fetchImpl?: typeof fetch) {
  if (fetchImpl) vi.stubGlobal('fetch', fetchImpl)
  const request = new Request(new URL(url, 'https://deep-cuts.pages.dev'), {
    method,
    headers: { 'CF-Connecting-IP': '203.0.113.7' },
  })
  const response = await onRequest({ request, env } as unknown as Parameters<typeof onRequest>[0])
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  }
}

tmdbProxyContract('Pages Function', (url, { method, token, fetchImpl }) =>
  viaFunction(url, method, { TMDB_READ_TOKEN: token }, fetchImpl),
)

describe('TMDB Pages Function: rate limit (Stage 4 H4)', () => {
  it('refuses a client over the limit with 429 before doing any work', async () => {
    const fetchImpl = vi.fn()
    const check = vi.fn(async () => ({ allowed: false }))
    const res = await viaFunction(
      '/api/tmdb/genre/movie/list',
      'GET',
      { TMDB_READ_TOKEN: 't', RATE_LIMITER: { check } },
      fetchImpl as unknown as typeof fetch,
    )
    expect(res).toMatchObject({ status: 429, body: '{"error":"rate_limited"}' })
    expect(res.headers['retry-after']).toBe('60')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(check).toHaveBeenCalledWith('203.0.113.7')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('serves a client within the limit', async () => {
    const res = await viaFunction(
      '/api/tmdb/genre/movie/list',
      'GET',
      { TMDB_READ_TOKEN: 't', RATE_LIMITER: { check: async () => ({ allowed: true }) } },
      (async () => Response.json({ genres: [] })) as unknown as typeof fetch,
    )
    expect(res.status).toBe(200)
  })

  it('fails open when the limiter itself fails', async () => {
    const res = await viaFunction(
      '/api/tmdb/genre/movie/list',
      'GET',
      {
        TMDB_READ_TOKEN: 't',
        RATE_LIMITER: {
          check: async () => {
            throw new Error('limiter down')
          },
        },
      },
      (async () => Response.json({ genres: [] })) as unknown as typeof fetch,
    )
    expect(res.status).toBe(200)
  })
})

describe('API catch-all', () => {
  it('answers unknown API paths with a JSON 404, not the app page', async () => {
    const request = new Request('https://deep-cuts.pages.dev/api/nope')
    const res = await apiCatchAll({ request, env: {} } as unknown as Parameters<
      typeof apiCatchAll
    >[0])
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('is rate-limited like the rest of the API', async () => {
    const request = new Request('https://deep-cuts.pages.dev/api/nope')
    const env = { RATE_LIMITER: { check: async () => ({ allowed: false }) } }
    const res = await apiCatchAll({ request, env } as unknown as Parameters<typeof apiCatchAll>[0])
    expect(res.status).toBe(429)
  })
})

describe('Functions middleware (Stage 4 H6)', () => {
  it('adds every production security header to Function answers', async () => {
    const next = async () => Response.json({ ok: true })
    const res = await middleware({ next } as unknown as Parameters<typeof middleware>[0])
    for (const [name, value] of Object.entries(productionHeaders))
      expect(res.headers.get(name)).toBe(value)
    expect(await res.json()).toEqual({ ok: true })
  })
})
