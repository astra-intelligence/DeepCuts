// When a failed data request is worth trying again (used as React Query's `retry` in main.tsx).
//
// Most failures (a network blip, a slow TMDB answer) are retried once. A 429 is not: it means this
// client is over the per-client rate limit (ADR-0029), and an immediate retry would only count
// against the limit again and push the next requests over it too.

/** How many times a request that may succeed on a second try is retried. */
const MAX_RETRIES = 1

/**
 * Says whether React Query should retry a failed request.
 * @param failureCount - How many times the request has already failed.
 * @param error - What it failed with. The app's API errors (`TmdbError`, `TagApiError`) carry the
 *   HTTP `status`; anything else (e.g. a network error) has none and is retried.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status
  if (status === 429) return false
  return failureCount < MAX_RETRIES
}
