// @vitest-environment node
// Tests for the TMDB proxy middleware: it adds the token server-side, forwards only allowed
// requests, and never leaks the token or upstream errors to the browser.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { createTmdbMiddleware } from './tmdbProxy'

function call(
  url: string,
  opts: { token?: string; method?: string; upstream?: Response | Error } = {},
) {
  const fetchImpl = vi.fn(async () => {
    if (opts.upstream instanceof Error) throw opts.upstream
    return opts.upstream ?? Response.json({ ok: true })
  })
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: '' }
  const response = {
    set statusCode(v: number) {
      res.statusCode = v
    },
    setHeader: (k: string, v: string) => {
      res.headers[k] = v
    },
    end: (b: string) => {
      res.body = b
    },
  } as unknown as ServerResponse
  const next = vi.fn()
  const mw = createTmdbMiddleware(
    'token' in opts ? opts.token : 'secret-token',
    fetchImpl as unknown as typeof fetch,
  )
  return {
    run: () => mw({ url, method: opts.method ?? 'GET' } as IncomingMessage, response, next),
    res,
    next,
    fetchImpl,
  }
}

describe('TMDB proxy middleware', () => {
  it('passes through non-proxy requests', async () => {
    const c = call('/src/main.tsx')
    await c.run()
    expect(c.next).toHaveBeenCalled()
  })

  it('injects the bearer token server-side and never echoes it', async () => {
    const c = call('/api/tmdb/search/movie?query=alien')
    await c.run()
    expect(c.fetchImpl).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/search/movie?query=alien&include_adult=false',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret-token' }),
      }),
    )
    expect(c.res.statusCode).toBe(200)
    expect(c.res.body).not.toContain('secret-token')
  })

  it.each([
    ['/api/tmdb/account', 404],
    ['/api/tmdb/search/movie?query=a&api_key=x', 400],
  ])('rejects %s with %i without calling TMDB', async (url, status) => {
    const c = call(url)
    await c.run()
    expect(c.res.statusCode).toBe(status)
    expect(c.fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects non-GET methods', async () => {
    const c = call('/api/tmdb/genre/movie/list', { method: 'POST' })
    await c.run()
    expect(c.res.statusCode).toBe(405)
  })

  it('returns 503 when the token is not configured', async () => {
    const c = call('/api/tmdb/genre/movie/list', { token: undefined })
    await c.run()
    expect(c.res.statusCode).toBe(503)
  })

  it('maps upstream failures without leaking details', async () => {
    const c = call('/api/tmdb/movie/1', {
      upstream: new Response('{"status_message":"x"}', { status: 401 }),
    })
    await c.run()
    expect(c.res).toMatchObject({ statusCode: 502, body: '{"error":"upstream_error"}' })
  })

  it('maps network errors and timeouts to 504', async () => {
    const c = call('/api/tmdb/movie/1', { upstream: new Error('timeout') })
    await c.run()
    expect(c.res.statusCode).toBe(504)
  })
})
