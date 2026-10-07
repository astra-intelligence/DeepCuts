// The catch-all for `/api/*` paths no other Function answers (ADR-0029). Without it, Pages would
// serve the app's index.html with a 200 for an unknown API path; a clear JSON 404 is easier to
// reason about and never looks like a success. Rate-limited like every API request.
import { rateLimit, type RateLimiterBinding } from '../../server/rateLimit.ts'
import { json } from '../../server/tmdbCore.ts'

/** Unknown API paths: rate limit first, then a JSON 404. */
export const onRequest: PagesFunction<{ RATE_LIMITER?: RateLimiterBinding }> = async ({
  request,
  env,
}) => (await rateLimit(request, env.RATE_LIMITER)) ?? json(404, { error: 'not_found' })
