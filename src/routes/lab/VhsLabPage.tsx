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
  hoverY: number
  hoverX: number
  lift: number
  perspective: number
  speed: number
  /** Turn to a fixed pose on hover, or lean toward the cursor. */
  mode: 'turn' | 'follow'
  /** Show every box in its hover pose, to compare without hovering. */
  freeze: boolean
}

// Starting values: real clamshell proportions and a modest turn (see vhs-box.css).
const DEFAULTS: Settings = {
  caseType: 'clamshell',
  aspect: 0.6,
  depth: 0.23,
  restY: 6,
  restX: -2,
  hoverY: 24,
  hoverX: -6,
  lift: 6,
  perspective: 1100,
  speed: 450,
  mode: 'turn',
  freeze: false,
}

// Box shapes to choose from. Posters are 2:3; real tape boxes are narrower, so the art is cropped
// at the sides (as it was on real covers).
const SHAPES = [
  { label: 'Clamshell (135 × 208 mm)', value: 0.6 },
  { label: 'Sleeve (105 × 190 mm)', value: 0.55 },
  { label: 'Poster (2:3, no crop)', value: 0.667 },
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
    '--vhs-hover-y': `${s.hoverY}deg`,
    '--vhs-hover-x': `${s.hoverX}deg`,
    '--vhs-lift': `${-s.lift}px`,
    '--vhs-perspective': `${s.perspective}px`,
    '--vhs-speed': `${s.speed}ms`,
  } as CSSProperties

  return (
    <div
      className="vhs-lab"
      style={vars}
      data-case={s.caseType}
      data-mode={s.mode}
      data-freeze={s.freeze || undefined}
    >
      <title>VHS box lab · Deep Cuts</title>
      <PageHeading
        eyebrow="Design lab · dev only"
        title="VHS box hover"
        lede="Hover a box (or tab to it) to see the turn. Tune it below, then send me the settings line."
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

  // "Follow cursor" mode: where the pointer is over the box, from -1 (left/top) to 1.
  const follow = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--px', String(((e.clientX - r.left) / r.width) * 2 - 1))
    e.currentTarget.style.setProperty('--py', String(((e.clientY - r.top) / r.height) * 2 - 1))
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
    ['hoverY', 'Turn on hover', 0, 45, 1, '°'],
    ['hoverX', 'Tilt on hover', -15, 15, 1, '°'],
    ['depth', 'Depth (share of width)', 0.12, 0.35, 0.01, ''],
    ['lift', 'Lift on hover', 0, 20, 1, 'px'],
    ['perspective', 'Perspective', 500, 2500, 50, 'px'],
    ['speed', 'Speed', 150, 1200, 25, 'ms'],
  ]
  const summary = `case=${s.caseType} shape=${s.aspect} depth=${s.depth} rest=${s.restY}°/${s.restX}° hover=${s.hoverY}°/${s.hoverX}° lift=${s.lift}px perspective=${s.perspective}px speed=${s.speed}ms mode=${s.mode}`

  return (
    <form
      className="mt-4 grid gap-4 rounded-card border border-card-border bg-card-bg p-4 shadow-card md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1 font-semibold">Case</legend>
        {(
          [
            ['clamshell', 'Rental clamshell (plastic, vinyl overlay)'],
            ['sleeve', 'Cardboard sleeve (retail)'],
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
          <label key={shape.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="shape"
              checked={s.aspect === shape.value}
              onChange={() => set('aspect', shape.value)}
              className="accent-slider-fill"
            />
            {shape.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1 font-semibold">Motion</legend>
        {(
          [
            ['turn', 'Turn to show the spine'],
            ['follow', 'Lean toward the cursor'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={s.mode === value}
              onChange={() => set('mode', value)}
              className="accent-slider-fill"
            />
            {label}
          </label>
        ))}
        <label className="mt-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.freeze}
            onChange={(e) => set('freeze', e.target.checked)}
            className="accent-slider-fill"
          />
          Show every box in its hover pose
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
