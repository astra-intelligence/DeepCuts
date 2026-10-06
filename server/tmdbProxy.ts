// Local TMDB proxy for `vite dev` and `vite preview` (ADR-0013). The read token stays on
// the server; only allowlisted requests are forwarded (ADR-0008).
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { resolveTmdbRequest } from './tmdbAllowlist'

const PREFIX = '/api/tmdb/'
const UPSTREAM = 'https://api.themoviedb.org/3/'

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', status === 200 ? 'private, max-age=300' : 'no-store')
  res.end(JSON.stringify(body))
}

export function createTmdbMiddleware(token: string | undefined, fetchImpl: typeof fetch = fetch) {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    if (!req.url?.startsWith(PREFIX)) return next()
    if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' })
    const url = new URL(req.url, 'http://localhost')
    const result = resolveTmdbRequest(url.pathname.slice(PREFIX.length), url.searchParams)
    if (!result.ok)
      return send(res, result.status, {
        error: result.status === 404 ? 'not_found' : 'bad_request',
      })
    if (!token) return send(res, 503, { error: 'tmdb_token_missing' })
    try {
      const upstream = await fetchImpl(
        `${UPSTREAM}${result.request.path}?${result.request.params}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!upstream.ok)
        return send(res, upstream.status === 404 ? 404 : 502, { error: 'upstream_error' })
      return send(res, 200, await upstream.json())
    } catch {
      return send(res, 504, { error: 'upstream_timeout' })
    }
  }
}

export function tmdbProxy(token: string | undefined): Plugin {
  const middleware = createTmdbMiddleware(token)
  return {
    name: 'deep-cuts-tmdb-proxy',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  }
}
