// Runs before every `/api/*` Function (ADR-0029, ADR-0031), so no route can forget the host pin,
// the rate limit or the Origin check (server/apiGuard.ts). The root functions/_middleware.ts then adds the
// security headers to whatever is answered.
import { guardApi } from '../../server/apiGuard.ts'
import type { RateLimiterBinding } from '../../server/rateLimit.ts'

/** What the middleware reads from the Pages project's bindings and `[vars]` (wrangler.toml). */
export type ApiEnv = {
  RATE_LIMITER?: RateLimiterBinding
  /** The only host the API answers on (server/apiGuard.ts). Not a secret. */
  CANONICAL_HOST?: string
}

/** The guard first; the route only runs if it lets the request through. */
export const onRequest: PagesFunction<ApiEnv> = async ({ request, env, next }) =>
  (await guardApi(request, env.RATE_LIMITER, env.CANONICAL_HOST)) ?? next()
