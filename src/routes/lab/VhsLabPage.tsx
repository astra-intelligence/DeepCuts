// VHS box hover lab (/lab/vhs, dev server only): Discover's grid of films drawn as 3D video-rental
// tape boxes, with a control panel to tune the look and the hover turn live.
//
// A prototype for the owner to iterate on, not an approved design: it isn't linked from the app
// and the route only exists under `npm run dev` (see router.tsx), so it never ships. The 3D box
// itself is plain CSS in vhs-box.css; this page only renders the faces and feeds the knobs to it
// as CSS variables. Once a look is approved it moves into tokens and the real PosterCard.
import { useQuery } from '@tanstack/react-query'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react'
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
  /** Mouse: the turn (cursor at a side edge) and tilt (top/bottom edge), from face-on. */
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
  leanY: 24,
  leanX: 12,
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

/**
 * The lab page. On wide screens (lg) the control panel is a sticky sidebar beside the boxes, so
 * they stay in view while you tune; on narrower screens the panel sits above them.
 */
export function VhsLabPage() {
  const [s, setS] = useState<Settings>(DEFAULTS)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }))
  // Which panel section has focus. While you adjust a Keyboard or Touch control, the boxes
  // preview that motion, since otherwise nothing on screen would change: the keyboard pose
  // needs a focused box (and focus is on the slider), and the scroll tilt only runs on phones.
  const [tuning, setTuning] = useState<Section | null>(null)
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
  const freeze = s.freeze || tuning === 'keyboard'
  const scrollPreview = s.scroll && (s.scrollPreview || tuning === 'touch')

  return (
    <div
      className="vhs-lab"
      style={vars}
      data-case={s.caseType}
      data-scroll={s.scroll || undefined}
      data-scroll-preview={scrollPreview || undefined}
      data-freeze={freeze || undefined}
    >
      <title>VHS box lab · Deep Cuts</title>
      <PageHeading
        eyebrow="Design lab · dev only"
        title="VHS box hover"
        lede="Move the mouse over a box to look around it, tab to one for the keyboard turn (Option+Tab in Safari), and scroll on a phone. Tune it here, then send me the settings line."
      />
      <div className="mt-4 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <Controls s={s} set={set} reset={() => setS(DEFAULTS)} onTuning={setTuning} />
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {films.map((movie) => (
            <li key={movie.id} className="flex">
              <VhsCard movie={movie} />
            </li>
          ))}
        </ul>
      </div>
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
      className="vhs-card group flex min-w-0 flex-1 flex-col rounded-control focus-visible:shadow-none focus-visible:outline-none"
    >
      {/* The box is decorative (aria-hidden): the title below names the link. */}
      <span aria-hidden="true" className="vhs-scene block">
        <span className="vhs-box">
          <span className="vhs-face vhs-top" />
          <span className="vhs-face vhs-bottom vhs-plastic" />
          <span className="vhs-face vhs-edge vhs-plastic">
            <span className="vhs-edge-label">{movie.title}</span>
          </span>
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
      {/* Keyboard focus: instead of the app's usual ring around the whole link, which would
          box in the turning 3D box too, the ring goes around this text block only (owner's call,
          2026-10-09). The box still turns to the keyboard pose. Same ring as the app's
          (3px focus color, 3px offset), so it reads as the standard focus indicator. */}
      <div className="mt-4 rounded-control group-focus-visible:outline-3 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus">
        <h3
          title={movie.title}
          className="mb-1 line-clamp-2 min-h-10 text-sm leading-snug font-semibold"
        >
          {movie.title}
        </h3>
        <p className="min-h-5 text-sm text-fg-muted">{meta.join(' · ')}</p>
      </div>
    </Link>
  )
}

/** The panel's sections. Focus inside Keyboard or Touch previews that motion on the boxes. */
type Section = 'box' | 'mouse' | 'keyboard' | 'touch'

/** A slider: [setting, label, min, max, step, unit]. */
type Slider = [keyof Settings, string, number, number, number, string]

const SLIDERS: Record<Section, Slider[]> = {
  box: [
    ['depth', 'Depth (share of width)', 0.12, 0.35, 0.005, ''],
    ['restY', 'Turn at rest', 0, 20, 1, '°'],
    ['restX', 'Tilt at rest', -10, 10, 1, '°'],
    ['perspective', 'Perspective', 500, 2500, 50, 'px'],
  ],
  mouse: [
    ['leanY', 'Turn at the sides', 0, 40, 1, '°'],
    ['leanX', 'Tilt at top and bottom', 0, 25, 1, '°'],
    ['lift', 'Lift (also on focus)', 0, 20, 1, 'px'],
    ['speed', 'Speed back to rest', 150, 1200, 25, 'ms'],
  ],
  keyboard: [
    ['focusY', 'Turn on focus', 0, 40, 1, '°'],
    ['focusX', 'Tilt on focus', -15, 15, 1, '°'],
  ],
  touch: [['scrollX', 'Tilt at the top and bottom of the screen', 0, 25, 1, '°']],
}

/**
 * The knobs, in sections, plus a one-line summary of the current settings to paste back to
 * Claude. On wide screens it's a sticky sidebar that scrolls on its own. The app's base styles
 * hide the focus ring on bare inputs, so every label wraps its input and carries
 * `focus-ring-within` to draw the ring around the whole control (index.css).
 * @param onTuning - Called with the section that has focus (null when focus leaves the panel).
 */
function Controls({
  s,
  set,
  reset,
  onTuning,
}: {
  s: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
  onTuning: (section: Section | null) => void
}) {
  // Focus or a press in a section previews that section's motion; focus or a press anywhere
  // else stops it. Presses count separately because Safari doesn't focus sliders and checkboxes
  // on click. Native focusin/focusout/pointerdown bubble, so a few listeners cover every control.
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const el = form.current
    if (!el) return
    const sectionOf = (target: EventTarget | null) =>
      ((target as HTMLElement | null)?.closest<HTMLElement>('[data-section]')?.dataset.section as
        Section | undefined) ?? null
    const onIn = (e: FocusEvent) => onTuning(sectionOf(e.target))
    const onOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) onTuning(null)
    }
    const onPress = (e: Event) =>
      onTuning(el.contains(e.target as Node) ? sectionOf(e.target) : null)
    el.addEventListener('focusin', onIn)
    el.addEventListener('focusout', onOut)
    document.addEventListener('pointerdown', onPress)
    return () => {
      el.removeEventListener('focusin', onIn)
      el.removeEventListener('focusout', onOut)
      document.removeEventListener('pointerdown', onPress)
    }
  }, [onTuning])

  const summary = `case=${s.caseType} shape=${s.aspect} depth=${s.depth} rest=${s.restY}°/${s.restX}° mouse=${s.leanY}°/${s.leanX}° focus=${s.focusY}°/${s.focusX}° scroll=${s.scroll ? `${s.scrollX}°` : 'off'} lift=${s.lift}px perspective=${s.perspective}px speed=${s.speed}ms`

  // One section of the panel. Its `data-section` tells the form's focus handler (below) which
  // motion you're tuning.
  const section = (id: Section, legend: string, hint: string, extra?: ReactNode) => (
    <fieldset
      data-section={id}
      className="flex flex-col gap-3 border-t border-border pt-4 text-sm first:border-t-0 first:pt-0"
    >
      <legend className="contents">
        <span className="font-semibold">{legend}</span>
      </legend>
      <p className="-mt-2 text-fg-muted">{hint}</p>
      {extra}
      {SLIDERS[id].map(([key, label, min, max, step, unit]) => (
        <label key={key} className="focus-ring-within flex flex-col gap-1 rounded-control">
          <span className="flex justify-between gap-2">
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
    </fieldset>
  )

  // A radio or checkbox row.
  const option = (control: ReactNode, label: string, key?: string) => (
    <label key={key} className="focus-ring-within flex items-center gap-2 rounded-control">
      {control}
      {label}
    </label>
  )

  return (
    <form
      ref={form}
      className="flex flex-col gap-5 rounded-card border border-card-border bg-card-bg p-4 shadow-card lg:sticky lg:top-24 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      {section(
        'box',
        'Box',
        'The case, its shape and how it sits at rest.',
        <>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Case">
            {(
              [
                ['sleeve', 'Cardboard sleeve (matte card)'],
                ['clamshell', 'Rental clamshell (plastic, vinyl overlay)'],
              ] as const
            ).map(([value, label]) =>
              option(
                <input
                  type="radio"
                  name="case"
                  checked={s.caseType === value}
                  onChange={() => set('caseType', value)}
                  className="accent-slider-fill"
                />,
                label,
                value,
              ),
            )}
          </div>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Box shape">
            {SHAPES.map((shape) =>
              option(
                <input
                  type="radio"
                  name="shape"
                  checked={s.aspect === shape.aspect}
                  onChange={() => {
                    set('aspect', shape.aspect)
                    set('depth', shape.depth)
                  }}
                  className="accent-slider-fill"
                />,
                shape.label,
                shape.label,
              ),
            )}
          </div>
        </>,
      )}
      {section('mouse', 'Mouse', 'Hover a box and move around it to try these.')}
      {section(
        'keyboard',
        'Keyboard',
        'Every box shows the keyboard pose while you adjust these.',
        option(
          <input
            type="checkbox"
            checked={s.freeze}
            onChange={(e) => set('freeze', e.target.checked)}
            className="accent-slider-fill"
          />,
          'Keep showing it on every box',
        ),
      )}
      {section(
        'touch',
        'Touch (phones)',
        'Boxes tilt as they scroll past. The preview runs while you adjust this; scroll the page to see the tilt change.',
        <>
          {option(
            <input
              type="checkbox"
              checked={s.scroll}
              onChange={(e) => set('scroll', e.target.checked)}
              className="accent-slider-fill"
            />,
            'Tilt the boxes while scrolling',
          )}
          {option(
            <input
              type="checkbox"
              checked={s.scrollPreview}
              disabled={!s.scroll}
              onChange={(e) => set('scrollPreview', e.target.checked)}
              className="accent-slider-fill"
            />,
            'Keep the preview on (here, with a mouse)',
          )}
        </>,
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
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
