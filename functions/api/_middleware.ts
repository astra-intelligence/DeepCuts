// Runs before every `/api/*` Function (ADR-0029, ADR-0031), so no route can forget the host pin,
// the rate limit or the Origin check (server/apiGuard.ts). The root functions/_middleware.ts then adds the
// security headers to whatever is answered.
import { guardApi } from '../../server/apiGuard.ts'
import { fail } from '../../server/http.ts'
import type { RateLimiterBinding } from '../../server/rateLimit.ts'

/** What the middleware reads from the Pages project's bindings and secrets. */
export type ApiEnv = {
  RATE_LIMITER?: RateLimiterBinding
  /**
   * The only host the API answers on (server/apiGuard.ts). A Pages secret, not a `wrangler.toml`
   * var, so the public repo never names the live site (ADR-0047).
   */
  CANONICAL_HOST?: string
}

/** The guard first; the route only runs if it lets the request through. */
export const onRequest: PagesFunction<ApiEnv> = async ({ request, env, next }) => {
  // Fail closed (ADR-0047): with no site address the pin would let every old deploy reach the
  // production database, so a missing secret stops the API instead of quietly opening it.
  if (!env.CANONICAL_HOST) return fail(500, 'host_not_configured')
  return (await guardApi(request, env.RATE_LIMITER, env.CANONICAL_HOST)) ?? next()
}
