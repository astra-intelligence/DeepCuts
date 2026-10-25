// @vitest-environment node
// Tests for the Cloudflare Pages Functions glue (ADR-0029, ADR-0031): the TMDB proxy Function
// passes the same contract as the local proxy; the `/api` middleware rate-limits and checks the
// Origin; the catch-all answers a JSON 404; the root middleware adds the security headers.
// The Workers globals it uses (`caches.default`, `fetch`) are replaced with fakes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onRequest as apiCatchAll } from '../functions/api/[[path]]'
import { onRequest, type Env } from '../functions/api/tmdb/[[path]]'
import { onRequest as middleware } from '../functions/_middleware'
import { onRequest as apiMiddleware, type ApiEnv } from '../functions/api/_middleware'
import { productionHeaders } from './securityHeaders'
import { tmdbProxyContract } from './tmdb/proxy.contract'

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

describe('/api middleware: rate limit (Stage 4 H4)', () => {
  // Runs the API middleware with `next` standing in for the route.
  async function viaApiMiddleware(request: Request, env: ApiEnv) {
    const next = vi.fn(async () => Response.json({ ok: true }))
    const res = await apiMiddleware({ request, env, next } as unknown as Parameters<
      typeof apiMiddleware
    >[0])
    return { res, next }
  }
  const get = (path: string) =>
    new Request(`https://deep-cuts.pages.dev${path}`, {
      headers: { 'CF-Connecting-IP': '203.0.113.7' },
    })

  it('refuses a client over the limit with 429 before the route runs', async () => {
    const check = vi.fn(async () => ({ allowed: false }))
    const { res, next } = await viaApiMiddleware(get('/api/tmdb/genre/movie/list'), {
      RATE_LIMITER: { check },
    })
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate_limited' })
    expect(res.headers.get('retry-after')).toBe('60')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(check).toHaveBeenCalledWith('203.0.113.7', 'api')
    expect(next).not.toHaveBeenCalled()
  })

  it('lets a client within the limit through', async () => {
    const { res } = await viaApiMiddleware(get('/api/tmdb/genre/movie/list'), {
      RATE_LIMITER: { check: async () => ({ allowed: true }) },
    })
    expect(res.status).toBe(200)
  })

  it('fails open when the limiter itself fails', async () => {
    const { res } = await viaApiMiddleware(get('/api/tmdb/genre/movie/list'), {
      RATE_LIMITER: {
        check: async () => {
          throw new Error('limiter down')
        },
      },
    })
    expect(res.status).toBe(200)
  })

  it('refuses a data-changing request from another origin', async () => {
    const request = new Request('https://deep-cuts.pages.dev/api/tags/import', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
    })
    const { res, next } = await viaApiMiddleware(request, {})
    expect(res.status).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('/api middleware: host pin', () => {
  const site = 'deep-cuts.example'
  async function viaApiMiddleware(url: string, env: ApiEnv) {
    const next = vi.fn(async () => Response.json({ ok: true }))
    const request = new Request(url, { headers: { 'CF-Connecting-IP': '203.0.113.7' } })
    const res = await apiMiddleware({ request, env, next } as unknown as Parameters<
      typeof apiMiddleware
    >[0])
    return { res, next }
  }

  it('answers on the site address', async () => {
    const { res } = await viaApiMiddleware(`https://${site}/api/tags`, { CANONICAL_HOST: site })
    expect(res.status).toBe(200)
  })

  it.each([
    'https://deep-cuts.pages.dev/api/tags',
    'https://3f2a9c1b.deep-cuts.pages.dev/api/auth/session',
    'https://3f2a9c1b.deep-cuts.pages.dev/api/tmdb/genre/movie/list',
    `https://${site}.evil.example/api/tags`,
  ])('refuses %s with 421 before the rate limiter or the route', async (url) => {
    const check = vi.fn(async () => ({ allowed: true }))
    const { res, next } = await viaApiMiddleware(url, {
      CANONICAL_HOST: site,
      RATE_LIMITER: { check },
    })
    expect(res.status).toBe(421)
    expect(await res.json()).toEqual({ error: 'wrong_host' })
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(check).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it.each(['http://localhost:8788', 'http://127.0.0.1:8788', 'http://[::1]:8788'])(
    'allows %s, where wrangler pages dev runs with the production config',
    async (origin) => {
      const { res } = await viaApiMiddleware(`${origin}/api/tags`, { CANONICAL_HOST: site })
      expect(res.status).toBe(200)
    },
  )

  it('allows any host when no site address is configured', async () => {
    const { res } = await viaApiMiddleware('https://deep-cuts.pages.dev/api/tags', {})
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
