// The TMDB proxy as a Cloudflare Pages Function (ADR-0029, Stage 4 H2). It answers every
// `/api/tmdb/*` request: the rate limit first (server/rateLimit.ts), then the same core the local
// Vite proxy uses (server/tmdbCore.ts), with Cloudflare's edge cache.
//
// Only `/api/*` reaches Functions at all (public/_routes.json), so static files never use the
// Function quota.
import { rateLimit, type RateLimiterBinding } from '../../../server/rateLimit.ts'
import { handleTmdb } from '../../../server/tmdbCore.ts'

/** What the Pages project gives the Function (wrangler.toml, plus the dashboard secret). */
export type Env = {
  /** TMDB's read token: an encrypted Pages secret in production, `.dev.vars` locally. */
  TMDB_READ_TOKEN?: string
  /** The rate-limit Worker, through a service binding. */
  RATE_LIMITER?: RateLimiterBinding
}

/**
 * Every method lands here; the core answers anything but GET with 405, so a 405 is rate-limited
 * like any other request.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const limited = await rateLimit(request, env.RATE_LIMITER)
  if (limited) return limited
  return handleTmdb(request, env.TMDB_READ_TOKEN, { cache: caches.default })
}
