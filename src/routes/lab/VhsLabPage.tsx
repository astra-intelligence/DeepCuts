// VHS box lab (/lab/vhs, dev server only): Discover's films as the real VHS box posters
// (VhsBox), with a control panel to try new values for the look and the motion live.
//
// The design was tuned here and approved on 2026-10-09; its values now live in
// src/components/VhsBox.css and the vhs-box tokens. The lab stays as a tuning tool: it renders the
// real component and only overrides the `--vhs-*` CSS variables on its wrapper, so what you see
// here is exactly what Discover would show with those values. It isn't linked from the app,
// and the route only exists under `npm run dev` (see router.tsx), so it never ships.
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { movieQueries } from '../../api/queries'
import { releaseYear, type MovieSummary } from '../../api/tmdb'
import { PageHeading } from '../../components/PageHeading'
import { VhsBox } from '../../components/VhsBox'
import { genreTone, primaryGenreName } from '../../domain/genres'
import './vhs-lab.css'

/** Every knob on the control panel. Angles in degrees, lift in px. */
interface Settings {
  /** Width / height of the box. */
  aspect: number
  /** Depth as a share of the width. */
  depth: number
  /** Poster on the front: fill it and crop the sides, or show the whole poster with bars. */
  artFit: 'cover' | 'contain'
  /** Which part of the poster the crop keeps, from 0 (left edge) to 100 (right edge). */
  artX: number
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
  /** Touch: tilt the boxes as they scroll past (phones only). */
  scroll: boolean
  /** Show the scroll tilt on this screen too, to try it with a mouse wheel. */
  scrollPreview: boolean
  /** Show every box in its keyboard-focus pose, to compare without tabbing. */
  freeze: boolean
}

// Starting values: the approved design (src/components/VhsBox.css).
const DEFAULTS: Settings = {
  aspect: 0.547,
  depth: 0.24,
  artFit: 'cover',
  artX: 50,
  restY: 6,
  restX: -2,
  leanY: 24,
  leanX: 12,
  focusY: 18,
  focusX: -4,
  scrollX: 8,
  lift: 4,
  perspective: 1100,
  scroll: true,
  scrollPreview: false,
  freeze: false,
}

// Box shapes to start from, W × H × D, checked 2026-10-09. Picking one sets both the shape
// (width / height) and the depth (share of the width); the Shape slider fine-tunes from there.
// Posters are 2:3 (0.667), so any narrower box crops the art at the sides.
// Sources: the sleeve and clamshell from Pacdora's VHS box template
// (https://www.pacdora.com/tools/vhs-box-template); the wide rental clamshell from a case
// maker's listing, 8 3/16" × 5 11/16" × 1 3/32"
// (https://www.duplication.com/vhs-clamshell-case-brand-new.html).
const SHAPES = [
  { label: 'Cardboard sleeve (104 × 190 × 25 mm)', aspect: 0.547, depth: 0.24 },
  { label: 'Clamshell (120 × 201 × 27 mm)', aspect: 0.597, depth: 0.225 },
  { label: 'Poster (2:3, no crop)', aspect: 0.667, depth: 0.24 },
  { label: 'Wide rental clamshell (144 × 208 × 28 mm)', aspect: 0.692, depth: 0.193 },
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

  // The knobs as the CSS variables the VHS box styles read.
  const vars = {
    '--vhs-aspect': s.aspect,
    '--vhs-depth': s.depth,
    '--vhs-art-fit': s.artFit,
    '--vhs-art-position': `${s.artX}% 50%`,
    '--vhs-rest-y': `${s.restY}deg`,
    '--vhs-rest-x': `${s.restX}deg`,
    '--vhs-lean-y': `${s.leanY}deg`,
    '--vhs-lean-x': `${s.leanX}deg`,
    '--vhs-focus-y': `${s.focusY}deg`,
    '--vhs-focus-x': `${s.focusX}deg`,
    '--vhs-scroll-x': `${s.scrollX}deg`,
    '--vhs-lift': `${-s.lift}px`,
    '--vhs-perspective': `${s.perspective}px`,
  } as CSSProperties
  const freeze = s.freeze || tuning === 'keyboard'
  const scrollPreview = s.scroll && (s.scrollPreview || tuning === 'touch')

  return (
    <div
      className="vhs-lab"
      style={vars}
      data-scroll={s.scroll || undefined}
      data-scroll-preview={scrollPreview || undefined}
      data-freeze={freeze || undefined}
    >
      <title>VHS box lab · Deep Cuts</title>
      <PageHeading
        eyebrow="Design lab · dev only"
        title="VHS box posters"
        lede="The approved design, as Discover shows it. Move the mouse over a box to look around it, tab to one for the keyboard turn (Option+Tab in Safari), and scroll on a phone. Try new values here, then send me the settings line."
      />
      <div className="mt-4 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <Controls s={s} set={set} reset={() => setS(DEFAULTS)} onTuning={setTuning} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5.5 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {films.map((movie) => (
            <li key={movie.id} className="flex">
              <LabCard movie={movie} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** One film: Discover's tile, trimmed to the box, title and year · genre. */
function LabCard({ movie }: { movie: MovieSummary }) {
  const meta = [releaseYear(movie.release_date), primaryGenreName(movie.genre_ids)].filter(Boolean)
  return (
    <Link
      to={`/movie/${movie.id}`}
      style={genreTone(movie.genre_ids)}
      data-vhs-target=""
      className="group relative flex min-w-0 flex-1 flex-col focus-visible:shadow-none focus-visible:outline-none"
    >
      <VhsBox movie={movie} />
      <div className="mt-3 group-focus-visible:outline-3 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus">
        <h3
          title={movie.title}
          className="mb-1 line-clamp-2 min-h-10 text-sm leading-snug font-bold"
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
    ['aspect', 'Shape (width / height)', 0.45, 0.75, 0.001, ''],
    ['depth', 'Depth (share of width)', 0.12, 0.35, 0.005, ''],
    ['artX', 'Crop keeps (0 = left edge, 100 = right)', 0, 100, 1, '%'],
    ['restY', 'Turn at rest', 0, 20, 1, '°'],
    ['restX', 'Tilt at rest', -10, 10, 1, '°'],
    ['perspective', 'Perspective', 500, 2500, 50, 'px'],
  ],
  mouse: [
    ['leanY', 'Turn at the sides', 0, 40, 1, '°'],
    ['leanX', 'Tilt at top and bottom', 0, 25, 1, '°'],
    ['lift', 'Lift (also on focus)', 0, 20, 1, 'px'],
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
 * @param onTuning - Called with the section being adjusted (null once you've moved elsewhere).
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

  const summary = `shape=${s.aspect} depth=${s.depth} art=${s.artFit}${s.artFit === 'cover' ? ` ${s.artX}%` : ''} rest=${s.restY}°/${s.restX}° mouse=${s.leanY}°/${s.leanX}° focus=${s.focusY}°/${s.focusX}° scroll=${s.scroll ? `${s.scrollX}°` : 'off'} lift=${s.lift}px perspective=${s.perspective}px`

  // One section of the panel. Its `data-section` tells the listeners above which motion you're
  // tuning.
  const section = (id: Section, legend: string, hint: string, extra?: ReactNode) => (
    <fieldset
      data-section={id}
      className="flex flex-col gap-3 border-t border-border pt-4 text-sm first:border-t-0 first:pt-0"
    >
      <legend className="contents">
        <span className="font-bold">{legend}</span>
      </legend>
      <p className="-mt-2 text-fg-muted">{hint}</p>
      {extra}
      {SLIDERS[id].map(([key, label, min, max, step, unit]) => (
        <label key={key} className="focus-ring-within flex flex-col gap-1">
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

  // A checkbox row.
  const checkbox = (
    key: 'freeze' | 'scroll' | 'scrollPreview',
    label: string,
    disabled = false,
  ) => (
    <label className="focus-ring-within flex items-center gap-2">
      <input
        type="checkbox"
        checked={s[key]}
        disabled={disabled}
        onChange={(e) => set(key, e.target.checked)}
        className="accent-slider-fill"
      />
      {label}
    </label>
  )

  return (
    <form
      ref={form}
      className="flex flex-col gap-5 border-2 border-card-border bg-card-bg p-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      {section(
        'box',
        'Box',
        'Its shape, how the poster fits it, its depth and how it sits at rest.',
        <>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Box shape">
            {SHAPES.map((shape) => (
              <label key={shape.label} className="focus-ring-within flex items-center gap-2">
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
          </div>
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Poster fit">
            {(
              [
                ['cover', 'Fill the front (crops the sides)'],
                ['contain', 'Whole poster (bars above and below)'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="focus-ring-within flex items-center gap-2">
                <input
                  type="radio"
                  name="fit"
                  checked={s.artFit === value}
                  onChange={() => set('artFit', value)}
                  className="accent-slider-fill"
                />
                {label}
              </label>
            ))}
          </div>
        </>,
      )}
      {section('mouse', 'Mouse', 'Hover a box and move around it to try these.')}
      {section(
        'keyboard',
        'Keyboard',
        'Every box shows the keyboard pose while you adjust these.',
        checkbox('freeze', 'Keep showing it on every box'),
      )}
      {section(
        'touch',
        'Touch (phones)',
        'Phones can’t hover or focus, so boxes rest in the keyboard pose and tilt as they scroll past. The preview runs while you adjust this; scroll the page (with the mouse over the boxes) to see the tilt change.',
        <>
          {checkbox('scroll', 'Tilt the boxes while scrolling')}
          {checkbox('scrollPreview', 'Keep the preview on (here, with a mouse)', !s.scroll)}
        </>,
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <code className="bg-surface-overlay p-2 break-all text-fg-muted">{summary}</code>
        <button type="button" onClick={reset} className="self-start text-accent underline">
          Reset to defaults
        </button>
      </div>
    </form>
  )
}
