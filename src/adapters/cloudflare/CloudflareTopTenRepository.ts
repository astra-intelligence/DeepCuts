// The Top Ten store for passkey accounts (ADR-0036): the account's list on the server, through
// `/api/top-ten`. It implements the same TopTenRepository contract as the browser store, so no
// screen changes; topTenRepository.contract.ts proves the behaviors match.
//
// The server applies the Top Ten rules itself (the same `addToTopTen`), so this adapter only sends
// what the person did and returns the list the server answers with. Unlike the tag store there is
// no local cache: TanStack Query already keeps the list, and it's one small request.
import { z } from 'zod'
import { TopTenFullError } from '../../domain/topTen'
import { topTenSchema, type TopTenRepository } from '../TopTenRepository'

/** A failed Top Ten API call (other than "the list is full", which is a `TopTenFullError`). */
export class TopTenApiError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Top Ten API failed (${status})`)
    this.status = status
  }
}

/** Every answer is the whole list, in ranked order. */
const answerSchema = z.object({ films: topTenSchema })
const errorSchema = z.object({ error: z.string() })

/** Calls the Top Ten API and returns the validated list; any error status or odd body throws. */
async function call(method: 'GET' | 'PUT' | 'DELETE', tmdbId?: number) {
  const res = await fetch('/api/top-ten', {
    method,
    credentials: 'same-origin',
    headers: tmdbId === undefined ? {} : { 'Content-Type': 'application/json' },
    body: tmdbId === undefined ? null : JSON.stringify({ tmdbId }),
  })
  const body: unknown = await res.json().catch(() => undefined)
  if (!res.ok) {
    // 409 `top_ten_full` is an expected outcome, not a failure: the screen shows "full".
    if (res.status === 409 && errorSchema.safeParse(body).data?.error === 'top_ten_full')
      throw new TopTenFullError()
    throw new TopTenApiError(res.status)
  }
  const parsed = answerSchema.safeParse(body)
  // A 200 that isn't a valid list (e.g. Pages serving HTML) counts as a bad gateway.
  if (!parsed.success) throw new TopTenApiError(502)
  return parsed.data
}

/** Builds the signed-in passkey account's Top Ten store. */
export function createCloudflareTopTenRepository(): TopTenRepository {
  return {
    list: async () => (await call('GET')).films,
    add: async (tmdbId) => (await call('PUT', tmdbId)).films,
    remove: async (tmdbId) => (await call('DELETE', tmdbId)).films,
  }
}
