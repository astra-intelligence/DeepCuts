// Allowlist for the local TMDB proxy (ADR-0008, ADR-0013). Pure and unit-tested:
// only these endpoints and parameters reach TMDB; anything else is rejected.
import { z } from 'zod'

export type TmdbRequest = { path: string; params: URLSearchParams }
export type AllowlistResult = { ok: true; request: TmdbRequest } | { ok: false; status: 400 | 404 }

const page = z.coerce.number().int().min(1).max(500)
const id = z.coerce.number().int().positive().max(99_999_999)
const genreList = z.string().regex(/^\d{1,6}([,|]\d{1,6}){0,9}$/)
const APPENDABLE = new Set(['release_dates', 'recommendations'])
const appendList = z.string().refine((v) => {
  const parts = v.split(',')
  return parts.every((p) => APPENDABLE.has(p)) && new Set(parts).size === parts.length
})

type Route = {
  pattern: RegExp
  params: z.ZodObject
  path: (match: RegExpMatchArray) => string
  fixed?: Record<string, string>
}

const ROUTES: Route[] = [
  {
    pattern: /^search\/movie$/,
    params: z.strictObject({ query: z.string().trim().min(1).max(100), page: page.optional() }),
    path: () => 'search/movie',
    fixed: { include_adult: 'false' },
  },
  {
    pattern: /^discover\/movie$/,
    params: z.strictObject({
      with_genres: genreList.optional(),
      without_genres: genreList.optional(),
      page: page.optional(),
      sort_by: z
        .enum(['popularity.desc', 'vote_average.desc', 'primary_release_date.desc'])
        .optional(),
      'vote_count.gte': z.coerce.number().int().min(0).max(100_000).optional(),
    }),
    path: () => 'discover/movie',
    fixed: { include_adult: 'false' },
  },
  {
    pattern: /^movie\/(\d+)$/,
    // Only these extras may be appended, so Detail and the scorer each need one call (ADR-0024,
    // ADR-0026): the content rating and the film's recommendations.
    params: z.strictObject({ append_to_response: appendList.optional() }),
    path: (m) => `movie/${id.parse(m[1])}`,
  },
  {
    pattern: /^movie\/(\d+)\/watch\/providers$/,
    params: z.strictObject({}),
    path: (m) => `movie/${id.parse(m[1])}/watch/providers`,
  },
  {
    pattern: /^genre\/movie\/list$/,
    params: z.strictObject({}),
    path: () => 'genre/movie/list',
  },
]

/** `subpath` is the part after `/api/tmdb/` with no leading slash or query string. */
export function resolveTmdbRequest(subpath: string, query: URLSearchParams): AllowlistResult {
  for (const route of ROUTES) {
    const match = subpath.match(route.pattern)
    if (!match) continue
    const keys = [...query.keys()]
    if (new Set(keys).size !== keys.length) return { ok: false, status: 400 }
    const parsed = route.params.safeParse(Object.fromEntries(query))
    if (!parsed.success) return { ok: false, status: 400 }
    let path: string
    try {
      path = route.path(match)
    } catch {
      return { ok: false, status: 400 }
    }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) params.set(k, String(v))
    }
    for (const [k, v] of Object.entries(route.fixed ?? {})) params.set(k, v)
    return { ok: true, request: { path, params } }
  }
  return { ok: false, status: 404 }
}
