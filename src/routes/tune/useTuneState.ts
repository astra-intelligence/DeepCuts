import { useSearchParams } from 'react-router'
import { z } from 'zod'

/** How many rating cards step 3 shows before finishing on Discover. */
export const PICKS = 3

const ids = z
  .string()
  .regex(/^\d{1,6}(,\d{1,6}){0,9}$/)
  .transform((s) => s.split(',').map(Number))
// Onboarding state lives in the URL, so Detail → back restores it (ADR-0019 amendment).
const paramsSchema = z.object({
  step: z.coerce.number().int().min(1).max(3).catch(1).default(1),
  genres: ids.catch([]).default([]),
  favorite: z.coerce.number().int().positive().max(99_999_999).optional().catch(undefined),
  // The film on the rating card (a TMDB id) and how many cards have been shown (1..PICKS).
  pick: z.coerce.number().int().positive().max(99_999_999).optional().catch(undefined),
  n: z.coerce.number().int().min(1).max(PICKS).catch(1).default(1),
})
export type TuneState = z.infer<typeof paramsSchema>

export function useTuneState() {
  const [params, setParams] = useSearchParams()
  const state = paramsSchema.parse(Object.fromEntries(params))
  const update = (patch: Partial<TuneState>, replace = false) => {
    const next = { ...state, ...patch }
    const out: Record<string, string> = { step: String(next.step) }
    if (next.genres.length) out.genres = next.genres.join(',')
    if (next.favorite) out.favorite = String(next.favorite)
    if (next.pick) out.pick = String(next.pick)
    if (next.n > 1) out.n = String(next.n)
    setParams(out, { replace })
  }
  return [state, update] as const
}

export type StepProps = { state: TuneState; update: ReturnType<typeof useTuneState>[1] }
