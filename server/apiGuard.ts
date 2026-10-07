// The checks every `/api/*` request passes before any route runs (ADR-0029, ADR-0031). Used by
// functions/api/_middleware.ts on Cloudflare, and by the accounts tests, so both run the same code:
// 1. The per-client rate limit (rateLimit.ts). Sign-in, registration and account changes count
//    against a tighter limit than everything else.
// 2. CSRF protection: any request that can change data (anything but GET/HEAD/OPTIONS) must come
//    from this site's own pages, judged by its `Origin` header. Otherwise 403 `bad_origin`.
import { fail, isSameOrigin, SAFE_METHODS } from './http.ts'
import { rateLimit, type RateLimiterBinding } from './rateLimit.ts'

/** Returns the response that stops the request (429 or 403), or null to let it through. */
export async function guardApi(
  request: Request,
  limiter: RateLimiterBinding | undefined,
): Promise<Response | null> {
  const limited = await rateLimit(request, limiter)
  if (limited) return limited
  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) return fail(403, 'bad_origin')
  return null
}
