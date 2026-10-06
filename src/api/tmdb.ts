// TMDB client (ADR-0002). Talks only to our proxy; every response is Zod-validated (ADR-0008, ADR-0015).
import { z } from 'zod'

const imagePath = z
  .string()
  .regex(/^\/[\w.-]+\.(jpg|jpeg|png|svg|webp)$/i)
  .nullable()
  .catch(null)

const movieSummary = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  release_date: z.string().optional().default(''),
  overview: z.string().default(''),
  poster_path: imagePath,
  backdrop_path: imagePath,
  genre_ids: z.array(z.number().int()).default([]),
})

export const searchResultsSchema = z.object({
  page: z.number().int(),
  total_pages: z.number().int(),
  total_results: z.number().int(),
  results: z.array(movieSummary),
})

export const movieDetailSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  tagline: z.string().default(''),
  release_date: z.string().default(''),
  runtime: z.number().int().nullable().default(null),
  overview: z.string().default(''),
  poster_path: imagePath,
  backdrop_path: imagePath,
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })).default([]),
})

const provider = z.object({
  provider_id: z.number().int(),
  provider_name: z.string(),
  logo_path: imagePath,
})

export const watchProvidersSchema = z.object({
  results: z.record(
    z.string(),
    z.object({
      flatrate: z.array(provider).optional(),
      rent: z.array(provider).optional(),
      buy: z.array(provider).optional(),
    }),
  ),
})

export type MovieSummary = z.infer<typeof movieSummary>
export type SearchResults = z.infer<typeof searchResultsSchema>
export type MovieDetail = z.infer<typeof movieDetailSchema>
export type Provider = z.infer<typeof provider>
export type WatchProviders = z.infer<typeof watchProvidersSchema>

export class TmdbError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`TMDB request failed (${status})`)
    this.status = status
  }
}

async function get<T>(
  path: string,
  schema: z.ZodType<T>,
  params?: Record<string, string>,
  signal?: AbortSignal,
) {
  const qs = params ? `?${new URLSearchParams(params)}` : ''
  const res = await fetch(`/api/tmdb/${path}${qs}`, signal ? { signal } : {})
  if (!res.ok) throw new TmdbError(res.status)
  return schema.parse(await res.json())
}

export const tmdb = {
  search: (query: string, page = 1, signal?: AbortSignal) =>
    get('search/movie', searchResultsSchema, { query, page: String(page) }, signal),
  movie: (id: number, signal?: AbortSignal) =>
    get(`movie/${id}`, movieDetailSchema, undefined, signal),
  watchProviders: (id: number, signal?: AbortSignal) =>
    get(`movie/${id}/watch/providers`, watchProvidersSchema, undefined, signal),
}

type ImageSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original'

/** Builds a TMDB CDN URL; the CSP only allows images from this host. */
export function imageUrl(path: string | null, size: ImageSize): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}

export function releaseYear(date: string): string {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : ''
}

export function formatRuntime(minutes: number | null): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

/** Subscription providers first, then rent/buy, de-duplicated. */
export function providersFor(data: WatchProviders, region: string): Provider[] {
  const r = data.results[region]
  if (!r) return []
  const seen = new Set<number>()
  return [...(r.flatrate ?? []), ...(r.rent ?? []), ...(r.buy ?? [])].filter((p) =>
    seen.has(p.provider_id) ? false : (seen.add(p.provider_id), true),
  )
}
