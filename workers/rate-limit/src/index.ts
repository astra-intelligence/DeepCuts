// The rate-limit Worker (ADR-0029, Stage 4 H4). Pages Functions can't use Cloudflare's
// rate-limit binding directly, so this tiny Worker holds it and the Pages Function asks it, over a
// service binding, whether a client may make another request.
//
// It never logs or stores the key it's given (the Function passes the client's IP). The binding
// counts requests per key in Cloudflare's memory for the configured period and forgets them.
import { WorkerEntrypoint } from 'cloudflare:workers'

/** What this Worker is bound to (workers/rate-limit/wrangler.toml). */
export type RateLimitEnv = {
  /** 60 requests per 60 s per key, for `/api/tmdb/*`. */
  API_LIMITER: RateLimit
}

/** The answer to one check. */
export type RateLimitResult = { allowed: boolean }

/**
 * Called by the Pages Function as `env.RATE_LIMITER.check(key)` (an RPC over the service
 * binding). Not reachable from the internet: the Worker has no route and `workers_dev` is off.
 */
export default class RateLimiter extends WorkerEntrypoint<RateLimitEnv> {
  /** Counts one request for `key` and says whether it's within the limit. */
  async check(key: string): Promise<RateLimitResult> {
    const { success } = await this.env.API_LIMITER.limit({ key })
    return { allowed: success }
  }

  /** Plain HTTP requests are refused: the only way in is the RPC method above. */
  async fetch(): Promise<Response> {
    return new Response(null, { status: 404 })
  }
}
