// VHS box hover lab (/lab/vhs, dev server only): Discover's grid of films drawn as 3D video-rental
// tape boxes, with a control panel to tune the look and the hover turn live.
//
// A prototype for the owner to iterate on, not an approved design: it isn't linked from the app
// and the route only exists under `npm run dev` (see router.tsx), so it never ships. The 3D box
// itself is plain CSS in vhs-box.css; this page only renders the faces and feeds the knobs to it
// as CSS variables. Once a look is approved it moves into tokens and the real PosterCard.
import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { movieQueries } from '../../api/queries'
import { imageUrl, releaseYear, type MovieSummary } from '../../api/tmdb'
import { GenreSticker } from '../../components/GenreSticker'
import { PageHeading } from '../../components/PageHeading'
import { genreTone, primaryGenreName } from '../../domain/genres'
import './vhs-box.css'

/** Every knob on the control panel. Angles in degrees, lift in px. */
interface Settings {
  /** Rental clamshell (plastic case, vinyl overlay) or cardboard retail sleeve. */
  caseType: 'clamshell' | 'sleeve'
  /** Width / height of the box. */
  aspect: number
  /** Depth as a share of the width. */
  depth: number
  restY: number
  restX: number
  /** Mouse: the extra turn (cursor at a side edge) and tilt (top/bottom edge) on top of rest. */
  leanY: number
  leanX: number
  /** Keyboard focus: the fixed turn and tilt. */
  focusY: number
  focusX: number
  /** Touch: the tilt at the top and bottom of the screen while scrolling. */
  scrollX: number
  lift: number
  perspective: number
  speed: number
  /** Touch: tilt the boxes as they scroll past (phones only). */
  scroll: boolean
  /** Show the scroll tilt on this screen too, to try it with a mouse wheel. */
  scrollPreview: boolean
  /** Show every box in its keyboard-focus pose, to compare without tabbing. */
  freeze: boolean
}

// Starting values: real cardboard-sleeve proportions and gentle angles (see vhs-box.css).
const DEFAULTS: Settings = {
  caseType: 'sleeve',
  aspect: 0.547,
  depth: 0.24,
  restY: 6,
  restX: -2,
  leanY: 14,
  leanX: 8,
  focusY: 18,
  focusX: -4,
  scrollX: 8,
  lift: 4,
  perspective: 1100,
  speed: 450,
  scroll: true,
  scrollPreview: false,
  freeze: false,
}

// Box shapes to choose from, W × H × D, checked 2026-10-09. Picking one sets both the shape
// (width / height) and the depth (share of the width). Posters are 2:3; real tape boxes are
// narrower, so the art is cropped at the sides (as it was on real covers).
// Sources: the sleeve and clamshell from Pacdora's VHS box template
// (https://www.pacdora.com/tools/vhs-box-template); the wide rental clamshell from a case
// maker's listing, 8 3/16" × 5 11/16" × 1 3/32"
// (https://www.duplication.com/vhs-clamshell-case-brand-new.html).
const SHAPES = [
  { label: 'Cardboard sleeve (104 × 190 × 25 mm)', aspect: 0.547, depth: 0.24 },
  { label: 'Clamshell (120 × 201 × 27 mm)', aspect: 0.597, depth: 0.225 },
  { label: 'Wide rental clamshell (144 × 208 × 28 mm)', aspect: 0.692, depth: 0.193 },
  { label: 'Poster (2:3, no crop)', aspect: 0.667, depth: 0.24 },
]

/** The lab page: control panel on top, a grid of boxes under it. */
export function VhsLabPage() {
  const [s, setS] = useState<Settings>(DEFAULTS)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }))
  const films = (useQuery(movieQueries.discover()).data?.results ?? []).slice(0, 15)

  // The knobs as the CSS variables vhs-box.css reads.
  const vars = {
    '--vhs-aspect': s.aspect,
    '--vhs-depth': s.depth,
    '--vhs-rest-y': `${s.restY}deg`,
    '--vhs-rest-x': `${s.restX}deg`,
    '--vhs-lean-y': `${s.leanY}deg`,
    '--vhs-lean-x': `${s.leanX}deg`,
    '--vhs-focus-y': `${s.focusY}deg`,
    '--vhs-focus-x': `${s.focusX}deg`,
    '--vhs-scroll-x': `${s.scrollX}deg`,
    '--vhs-lift': `${-s.lift}px`,
    '--vhs-perspective': `${s.perspective}px`,
    '--vhs-speed': `${s.speed}ms`,
  } as CSSProperties

  return (
    <div
      className="vhs-lab"
      style={vars}
      data-case={s.caseType}
      data-scroll={s.scroll || undefined}
      data-scroll-preview={s.scrollPreview || undefined}
      data-freeze={s.freeze || undefined}
    >
      <title>VHS box lab · Deep Cuts</title>
      <PageHeading
        eyebrow="Design lab · dev only"
        title="VHS box hover"
        lede="Move the mouse over a box to look around it, tab to one for the keyboard turn, and scroll on a phone. Tune it below, then send me the settings line."
      />
      <Controls s={s} set={set} reset={() => setS(DEFAULTS)} />
      <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
        {films.map((movie) => (
          <li key={movie.id} className="flex">
            <VhsCard movie={movie} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One film: the 3D box, then the same title and meta lines as Discover's tiles. */
function VhsCard({ movie }: { movie: MovieSummary }) {
  const poster = imageUrl(movie.poster_path, 'w342')
  const year = releaseYear(movie.release_date)
  const meta = [year, primaryGenreName(movie.genre_ids)].filter(Boolean)

  // Mouse: where the pointer is over the box, from -1 (left/top) to 1 (right/bottom).
  // Measured against the box, not the whole link, so the title lines below don't count; over
  // the title it stays at the bottom edge (clamped to 1). Written straight to CSS variables
  // rather than React state, so moving the mouse doesn't re-render anything.
  const follow = (e: PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.querySelector('.vhs-scene')
    if (!box) return
    const r = box.getBoundingClientRect()
    const clamp = (n: number) => Math.max(-1, Math.min(1, n)).toFixed(3)
    e.currentTarget.style.setProperty('--px', clamp(((e.clientX - r.left) / r.width) * 2 - 1))
    e.currentTarget.style.setProperty('--py', clamp(((e.clientY - r.top) / r.height) * 2 - 1))
  }

  return (
    <Link
      to={`/movie/${movie.id}`}
      style={genreTone(movie.genre_ids)}
      onPointerMove={follow}
      className="vhs-card flex min-w-0 flex-1 flex-col rounded-control"
    >
      {/* The box is decorative (aria-hidden): the title below names the link. */}
      <span aria-hidden="true" className="vhs-scene block">
        <span className="vhs-box">
          <span className="vhs-face vhs-top" />
          <span className="vhs-face vhs-bottom vhs-plastic" />
          <span className="vhs-face vhs-edge vhs-plastic" />
          <span className="vhs-face vhs-spine">
            <span className="vhs-spine-band">{year.slice(2) && `’${year.slice(2)}`}</span>
            <span className="vhs-spine-title">{movie.title}</span>
            <span className="vhs-spine-label">
              <span className="vhs-barcode" />
            </span>
          </span>
          <span className="vhs-face vhs-front vhs-plastic">
            {poster ? (
              <img src={poster} alt="" loading="lazy" />
            ) : (
              <span className="block size-full bg-poster-placeholder" />
            )}
            <GenreSticker
              genreIds={movie.genre_ids}
              seed={movie.id}
              className="absolute top-3 right-3 z-2"
            />
          </span>
        </span>
      </span>
      <h3
        title={movie.title}
        className="mt-4 mb-1 line-clamp-2 min-h-10 text-sm leading-snug font-semibold"
      >
        {movie.title}
      </h3>
      <p className="min-h-5 text-sm text-fg-muted">{meta.join(' · ')}</p>
    </Link>
  )
}

/** The knobs, plus a one-line summary of the current settings to paste back to Claude. */
function Controls({
  s,
  set,
  reset,
}: {
  s: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}) {
  // Every slider: [setting, label, min, max, step, unit].
  const sliders: [keyof Settings, string, number, number, number, string][] = [
    ['restY', 'Turn at rest', 0, 20, 1, '°'],
    ['restX', 'Tilt at rest', -10, 10, 1, '°'],
    ['leanY', 'Mouse: extra turn at the sides', 0, 40, 1, '°'],
    ['leanX', 'Mouse: tilt at top/bottom', 0, 25, 1, '°'],
    ['focusY', 'Keyboard: turn on focus', 0, 40, 1, '°'],
    ['focusX', 'Keyboard: tilt on focus', -15, 15, 1, '°'],
    ['scrollX', 'Touch: tilt while scrolling', 0, 20, 1, '°'],
    ['depth', 'Depth (share of width)', 0.12, 0.35, 0.005, ''],
    ['lift', 'Lift on hover/focus', 0, 20, 1, 'px'],
    ['perspective', 'Perspective', 500, 2500, 50, 'px'],
    ['speed', 'Speed', 150, 1200, 25, 'ms'],
  ]
  const summary = `case=${s.caseType} shape=${s.aspect} depth=${s.depth} rest=${s.restY}°/${s.restX}° mouse=${s.leanY}°/${s.leanX}° focus=${s.focusY}°/${s.focusX}° scroll=${s.scroll ? `${s.scrollX}°` : 'off'} lift=${s.lift}px perspective=${s.perspective}px speed=${s.speed}ms`

  return (
    <form
      className="mt-4 grid gap-4 rounded-card border border-card-border bg-card-bg p-4 shadow-card md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1 font-semibold">Case</legend>
        {(
          [
            ['sleeve', 'Cardboard sleeve (matte card)'],
            ['clamshell', 'Rental clamshell (plastic, vinyl overlay)'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="case"
              checked={s.caseType === value}
              onChange={() => set('caseType', value)}
              className="accent-slider-fill"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1 font-semibold">Box shape</legend>
        {SHAPES.map((shape) => (
          <label key={shape.label} className="flex items-center gap-2">
            <input
              type="radio"
              name="shape"
              checked={s.aspect === shape.aspect}
              onChange={() => {
                set('aspect', shape.aspect)
                set('depth', shape.depth)
              }}
              className="accent-slider-fill"
            />
            {shape.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1 font-semibold">Keyboard and touch</legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.freeze}
            onChange={(e) => set('freeze', e.target.checked)}
            className="accent-slider-fill"
          />
          Show every box in its keyboard-focus pose
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.scroll}
            onChange={(e) => set('scroll', e.target.checked)}
            className="accent-slider-fill"
          />
          Phones: tilt the boxes while scrolling
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.scrollPreview}
            disabled={!s.scroll}
            onChange={(e) => set('scrollPreview', e.target.checked)}
            className="accent-slider-fill"
          />
          Preview the scroll tilt on this screen
        </label>
      </fieldset>
      {sliders.map(([key, label, min, max, step, unit]) => (
        <label key={key} className="flex flex-col gap-1 text-sm">
          <span className="flex justify-between">
            {label}
            <output className="text-fg-muted tabular-nums">
              {String(s[key])}
              {unit}
            </output>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number(s[key])}
            onChange={(e) => set(key, Number(e.target.value) as never)}
            className="accent-slider-fill"
          />
        </label>
      ))}
      <div className="flex flex-col gap-2 text-sm md:col-span-2 lg:col-span-3">
        <code className="rounded-control bg-surface-overlay p-2 break-all text-fg-muted">
          {summary}
        </code>
        <button type="button" onClick={reset} className="self-start text-info underline">
          Reset to defaults
        </button>
      </div>
    </form>
  )
}
