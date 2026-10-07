// Local TMDB proxy for `vite dev` and `vite preview` (ADR-0013). The read token stays on
// the server; only allowlisted requests are forwarded (ADR-0008).
//
// The browser calls `/api/tmdb/<path>`; this middleware checks the request against the
// allowlist, adds the secret token, calls TMDB, and returns the JSON. Errors are reduced to a
// short code, so TMDB's own messages (or the token) never reach the browser.
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { resolveTmdbRequest } from './tmdbAllowlist.ts'

// Requests under this path are ours; everything else passes to the next middleware.
const PREFIX = '/api/tmdb/'
const UPSTREAM = 'https://api.themoviedb.org/3/'

/**
 * Shrinks a film's appended credits to its directors before they reach the browser (ADR-0028).
 * Full credits list the whole cast and crew (often 50–150 kB); the app only uses directors.
 * Anything that isn't a film-details body with credits passes through unchanged.
 */
export function trimCredits(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('credits' in body)) return body
  const credits = (body as { credits: unknown }).credits
  const crew =
    typeof credits === 'object' &&
    credits !== null &&
    'crew' in credits &&
    Array.isArray(credits.crew)
      ? credits.crew
      : []
  const directors = crew
    .filter((p: { job?: unknown }) => p?.job === 'Director')
    .map(({ id, name, job }: { id: unknown; name: unknown; job: unknown }) => ({ id, name, job }))
  return { ...body, credits: { crew: directors } }
}

// Sends a JSON response. Successful answers may be cached privately for 5 minutes; errors never.
function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', status === 200 ? 'private, max-age=300' : 'no-store')
  res.end(JSON.stringify(body))
}

/**
 * The proxy as a Connect middleware.
 * @param token - TMDB's read token, from .env.local (never a VITE_ variable, so never bundled).
 * @param fetchImpl - Tests pass a fake fetch.
 */
export function createTmdbMiddleware(token: string | undefined, fetchImpl: typeof fetch = fetch) {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    if (!req.url?.startsWith(PREFIX)) return next()
    // Read-only: only GET is forwarded.
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' })
    const url = new URL(req.url, 'http://localhost')
    // Check the path and parameters against the allowlist (tmdbAllowlist.ts).
    const result = resolveTmdbRequest(url.pathname.slice(PREFIX.length), url.searchParams)
    if (!result.ok)
      return send(res, result.status, {
        error: result.status === 404 ? 'not_found' : 'bad_request',
      })
    // No token configured (e.g. in E2E tests): a clear error instead of a failed TMDB call.
    if (!token) return send(res, 503, { error: 'tmdb_token_missing' })
    try {
      const upstream = await fetchImpl(
        `${UPSTREAM}${result.request.path}?${result.request.params}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          // Give up after 8 seconds rather than leaving the page waiting.
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!upstream.ok)
        return send(res, upstream.status === 404 ? 404 : 502, { error: 'upstream_error' })
      return send(res, 200, trimCredits(await upstream.json()))
    } catch {
      return send(res, 504, { error: 'upstream_timeout' })
    }
  }
}

/** The Vite plugin that installs the proxy in both the dev server and `vite preview`. */
export function tmdbProxy(token: string | undefined): Plugin {
  const middleware = createTmdbMiddleware(token)
  return {
    name: 'deep-cuts-tmdb-proxy',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  }
}
