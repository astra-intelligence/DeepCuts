// The weights lab (/lab/weights, dev server only): sliders for the recommendation scorer's
// weights. Like every lab it never ships: the route only exists under `npm run dev` (router.tsx).
import { useState } from 'react'
import { withToast } from '../../notify'
import {
  Button,
  Label,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { releaseYear } from '../../api/tmdb'
import { EmptyState } from '../../components/EmptyState'
import { HOME } from '../../config/features'
import { PageHeading } from '../../components/PageHeading'
import {
  DEFAULT_WEIGHTS,
  DIVERSITY_PENALTY,
  normalizeWeights,
  SCORE_PARTS,
  type ScorePart,
  type Weights,
} from '../../domain/scorer'
import { useTaste, type Recommendation } from '../../session/useRecommendations'

// The weights lab (ADR-0026 follow-up): the owner tunes the scorer against their own tags and
// sees the picks re-rank live. Settings live in the URL (whole numbers, so links stay readable):
// a tuning can be bookmarked or shared, and nothing is stored.

// How many picks the table shows.
const LIMIT = 20
// 0.32 → 32: sliders and the URL use whole percentages.
const toPercent = (n: number) => Math.round(n * 100)
// The URL key for the genre-variety slider (the scorer's diversity penalty).
const DIVERSITY_KEY = 'diversity'

// Plain-language names for the score parts: slider label, short table header, and hint.
const PARTS: Record<ScorePart, { label: string; short: string; hint: string }> = {
  support: {
    label: 'Recommended by your likes',
    short: 'Likes',
    hint: 'How many of your liked films recommend it, or share its series.',
  },
  genre: {
    label: 'Genre fit',
    short: 'Genre',
    hint: 'Genres you like count up; genres you dislike count down a little, never out.',
  },
  quality: {
    label: 'Rating',
    short: 'Rating',
    hint: 'TMDB rating, trusted more as votes grow.',
  },
  deepCut: { label: 'Deep cut', short: 'Deep', hint: 'Lesser-known films rise.' },
  decade: { label: 'Decade fit', short: 'Decade', hint: 'Same decade as the films you liked.' },
  language: {
    label: 'Language fit',
    short: 'Lang.',
    hint: 'Same original language as the films you liked.',
  },
  keywords: {
    label: 'Keyword overlap',
    short: 'Keys',
    hint: 'Shares story keywords with films you like (top 20 candidates only).',
  },
  director: {
    label: 'Same director',
    short: 'Dir.',
    hint: 'Made by a director of a film you liked (top 20 candidates only).',
  },
  writer: {
    label: 'Same writer',
    short: 'Wri.',
    hint: 'Written by a writer of a film you liked (top 20 candidates only).',
  },
  series: {
    label: 'Same series',
    short: 'Ser.',
    hint: 'Part of a series you liked a film from, e.g. a sequel.',
  },
  cast: {
    label: 'Same actor',
    short: 'Cast',
    hint: 'Stars a top-billed actor from a film you liked (top 20 candidates only).',
  },
  studio: {
    label: 'Same studio',
    short: 'Stu.',
    hint: 'Made by a studio behind a film you liked, not counting the majors (top 20 only).',
  },
}

// URL values are untrusted: each must be a whole number in range, or it falls back to the default.
const level = (fallback: number, max = 100) =>
  z.coerce.number().int().min(0).max(max).catch(fallback)
const paramsSchema = z.object({
  ...(Object.fromEntries(
    SCORE_PARTS.map((p) => [p, level(toPercent(DEFAULT_WEIGHTS[p]))]),
  ) as Record<ScorePart, ReturnType<typeof level>>),
  [DIVERSITY_KEY]: level(toPercent(DIVERSITY_PENALTY), 20),
})

/** The weights lab page. Dev server only (`FEATURES.labs`). */
export function WeightsPage() {
  const [params, setParams] = useSearchParams()
  const { diversity, ...levels } = paramsSchema.parse(Object.fromEntries(params))
  const weights = normalizeWeights(levels)
  const diversityPenalty = diversity / 100
  const taste = useTaste()
  const tuned = taste.score({ weights, diversityPenalty, limit: LIMIT })
  const baseline = taste.score({ limit: LIMIT })
  // Today's default ranking, to show how far each film moved.
  const baselineRank = new Map(baseline.map((r, i) => [r.movie.id, i]))
  const tunedIds = new Set(tuned.map((r) => r.movie.id))
  const dropped = baseline.filter((r) => !tunedIds.has(r.movie.id))
  const allZero = SCORE_PARTS.every((p) => levels[p] === 0)

  // Writes one slider's value into the URL. `replace` avoids a history entry per slider step.
  function set(key: ScorePart | typeof DIVERSITY_KEY, value: number) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(key, String(value))
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  return (
    <>
      <title>Tune the weights · Deep Cuts</title>
      <PageHeading
        eyebrow="Scorer lab"
        title="Tune the weights"
        lede="Move a slider and your Discover picks re-rank here. Nothing changes in Discover until the defaults are updated."
      />

      {!taste.hasLikes ? (
        <EmptyState>
          Like a few films first. The weights rank films your likes recommend, so there’s nothing to
          tune yet.{' '}
          <Link to={HOME.path} className="text-info underline">
            Find films to like
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section aria-labelledby="weights" className="grid gap-5 lg:sticky lg:top-48">
            <h2 id="weights" className="text-lg font-semibold">
              Weights
            </h2>
            {SCORE_PARTS.map((p) => (
              <WeightSlider
                key={p}
                label={PARTS[p].label}
                hint={PARTS[p].hint}
                value={levels[p]}
                share={allZero ? 0 : toPercent(weights[p])}
                onChange={(v) => set(p, v)}
              />
            ))}
            <WeightSlider
              label="Genre variety"
              hint="How far a film drops for each earlier pick in the same genre."
              value={diversity}
              max={20}
              onChange={(v) => set(DIVERSITY_KEY, v)}
            />
            <Summary weights={weights} diversityPenalty={diversityPenalty} />
          </section>

          <section aria-labelledby="picks" className="min-w-0">
            <h2 id="picks" className="text-lg font-semibold">
              Your top {LIMIT}
            </h2>
            <p className="mb-2.5 text-sm text-fg-muted">
              Change is the move from the default weights. Part scores run 0–100.
            </p>
            {allZero && (
              <p
                role="alert"
                className="mb-3 rounded-container border border-border-control p-3 text-sm"
              >
                Every weight is at zero, so every film scores 0%. Turn at least one up.
              </p>
            )}
            {taste.loading ? (
              <p role="status">Loading your picks…</p>
            ) : tuned.length === 0 ? (
              <EmptyState>
                Your likes don’t recommend any films you haven’t tagged yet. Like a few more films.
              </EmptyState>
            ) : (
              <PicksTable picks={tuned} baselineRank={baselineRank} />
            )}
            {dropped.length > 0 && (
              <p className="mt-3 text-sm text-fg-muted">
                Left your top {LIMIT}:{' '}
                {dropped.map((r, i) => (
                  <span key={r.movie.id}>
                    {i > 0 && ', '}
                    <cite className="text-fg not-italic">{r.movie.title}</cite>
                  </span>
                ))}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}

// One labelled slider with its value, share of the score, and a hint (React Aria Slider:
// keyboard and screen-reader accessible).
function WeightSlider({
  label,
  hint,
  value,
  share,
  max = 100,
  onChange,
}: {
  label: string
  hint: string
  value: number
  /** This part's share of the score, after the weights are scaled to add up to 100%. */
  share?: number
  max?: number
  onChange: (value: number) => void
}) {
  const [hintId] = useState(() => `hint-${label.replace(/\W+/g, '-').toLowerCase()}`)
  return (
    <Slider
      value={value}
      minValue={0}
      maxValue={max}
      onChange={onChange}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
    >
      <Label className="text-sm font-semibold">{label}</Label>
      <SliderOutput className="text-sm text-fg-muted tabular-nums">
        {({ state }) =>
          share === undefined ? state.getThumbValue(0) : `${state.getThumbValue(0)} · ${share}%`
        }
      </SliderOutput>
      <SliderTrack className="relative col-span-2 h-11">
        {({ state }) => (
          <>
            <span className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slider-track" />
            <span
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slider-fill"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb
              aria-describedby={hintId}
              className="focus-ring-within top-1/2 size-6 rounded-full border-2 border-slider-thumb-border bg-slider-thumb shadow-raised data-dragging:scale-110"
            />
          </>
        )}
      </SliderTrack>
      <p id={hintId} className="col-span-2 -mt-1 text-sm text-fg-muted">
        {hint}
      </p>
    </Slider>
  )
}

/** The current settings as code, ready to paste into DEFAULT_WEIGHTS (or send to the developer). */
function Summary({ weights, diversityPenalty }: { weights: Weights; diversityPenalty: number }) {
  const text = [
    ...SCORE_PARTS.map((p) => `${p}: ${weights[p].toFixed(2)}`),
    `diversityPenalty: ${diversityPenalty.toFixed(2)}`,
  ].join('\n')

  function copy() {
    void withToast(() => navigator.clipboard.writeText(text), {
      success: 'Copied.',
      error: 'Couldn’t copy. Select the settings above instead.',
    })
  }

  return (
    <div className="grid gap-2.5 rounded-card border border-card-border bg-card-bg p-4">
      <h3 className="text-sm font-semibold">These settings</h3>
      <pre className="overflow-x-auto text-sm text-fg-muted tabular-nums">
        <code>{text}</code>
      </pre>
      <div className="flex flex-wrap gap-2.5">
        <Button
          onPress={copy}
          className="min-h-11 rounded-button border border-button-secondary-border px-3.5 text-sm font-semibold hover:border-accent"
        >
          Copy settings
        </Button>
        <Link
          to="/lab/weights"
          replace
          preventScrollReset
          className="inline-flex min-h-11 items-center rounded-button px-3.5 text-sm font-semibold text-info"
        >
          Reset to defaults
        </Link>
      </div>
      <p className="text-sm text-fg-muted">
        The page link keeps these settings, so you can bookmark or share it.
      </p>
    </div>
  )
}

// The ranked picks, with each part's score so you can see why a film ranks where it does.
function PicksTable({
  picks,
  baselineRank,
}: {
  picks: Recommendation[]
  baselineRank: Map<number, number>
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-card-border">
      <table className="w-full text-left text-sm tabular-nums">
        <thead className="bg-surface-raised text-fg-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              #
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Film
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Change
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Match
            </th>
            {SCORE_PARTS.map((p) => (
              <th key={p} scope="col" className="px-3 py-2 font-semibold">
                <abbr title={PARTS[p].label} className="no-underline">
                  {PARTS[p].short}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {picks.map((r, i) => (
            <tr key={r.movie.id} className="border-t border-border">
              <td className="px-3 py-2 text-fg-muted">{i + 1}</td>
              <th scope="row" className="min-w-40 px-3 py-2 font-semibold">
                <Link to={`/movie/${r.movie.id}`} className="text-info underline">
                  {r.movie.title}
                </Link>{' '}
                <span className="font-normal text-fg-muted">
                  {releaseYear(r.movie.release_date)}
                </span>
              </th>
              <td className="px-3 py-2 whitespace-nowrap">
                <Change from={baselineRank.get(r.movie.id)} to={i} />
              </td>
              <td className="px-3 py-2 font-bold text-accent">{r.match}%</td>
              {SCORE_PARTS.map((p) => (
                <td key={p} className="px-3 py-2 text-fg-muted">
                  {toPercent(r.parts[p])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Rank change against the default weights, as words for screen readers and arrows on screen. */
function Change({ from, to }: { from: number | undefined; to: number }) {
  if (from === undefined) return <span className="font-semibold text-info">New</span>
  const moved = from - to
  if (moved === 0) return <span className="text-fg-muted">–</span>
  return (
    <span className={moved > 0 ? 'text-accent' : 'text-fg-muted'}>
      <span aria-hidden="true">
        {moved > 0 ? '↑' : '↓'}
        {Math.abs(moved)}
      </span>
      <span className="sr-only">
        {moved > 0 ? 'Up' : 'Down'} {Math.abs(moved)}
      </span>
    </span>
  )
}
