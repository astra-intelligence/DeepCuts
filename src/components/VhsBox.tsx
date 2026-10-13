// The VHS box poster: a film drawn as a 3D cardboard video sleeve, with the poster on the front,
// a printed spine, the cassette in the open end, and the VHS genre sticker on the cover.
// Design approved 2026-10-09 (tuned in the dev-only lab, /lab/vhs).
//
// The look is the co-located stylesheet VhsBox.css, and so is the motion for the keyboard and
// touch. The mouse motion is a small per-frame animation here (see below), which
// the CSS turns into angles. Purely decorative: the title, year and genre are always written
// next to the box, so it's hidden from screen readers. Colors come from the vhs-box component
// tokens and the film's genre tone (`--tone`, set by genreTone() on a parent).
import { useEffect, useRef } from 'react'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { GenreSticker } from './GenreSticker'
import { LoadingImage } from './LoadingImage'
import './VhsBox.css'

/**
 * How quickly the mouse motion catches up, in ms: the time to cover 63% of the way to where the
 * pointer aims (95% takes three times as long, about 0.55s). Longer is smoother but lazier;
 * the owner found 150ms transitions jittery (2026-10-09).
 */
const SMOOTHING = 180

/**
 * A film as a 3D VHS box, as wide as its container.
 *
 * Put it inside the interactive element it belongs to (a link) and give that element
 * `data-vhs-target`: hovering it lets the mouse look around the box, and keyboard focus on it
 * turns the box to show its spine. On phones the box tilts as it scrolls past. Everything is
 * still under reduced motion.
 */
export function VhsBox({
  movie,
}: {
  movie: Pick<MovieSummary, 'id' | 'title' | 'poster_path' | 'release_date' | 'genre_ids'>
}) {
  const scene = useRef<HTMLSpanElement>(null)

  // Mouse: look around the box. While the mouse is over the target, it carries
  // `data-vhs-active` and three CSS variables the styles turn into angles:
  //   --vhs-px, --vhs-py  where the pointer is over the box, -1 (left/top) to 1 (right/bottom),
  //                       measured against the box (the text below counts as its bottom edge)
  //   --vhs-h             how far into the hover pose it is, 0 (resting) to 1 (following)
  // Each frame moves the three a share of the way toward their targets (exponential smoothing),
  // so entering eases in, following glides instead of restarting a transition on every mouse
  // event (which looked jittery), and leaving eases back to rest. Written straight to the
  // element, not React state, so moving the mouse never re-renders. Native listeners: the box
  // itself is decorative and takes no events. Off under reduced motion.
  useEffect(() => {
    const box = scene.current
    const target = box?.closest<HTMLElement>('[data-vhs-target]')
    if (!box || !target) return
    // Asked on each hover, so a change to the setting applies at once. (matchMedia is missing in
    // some test environments; treat that as no preference.)
    const reducedMotion = () =>
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const clamp = (n: number) => Math.max(-1, Math.min(1, n))
    const now = { x: 0, y: 0, h: 0 }
    const goal = { x: 0, y: 0, h: 0 }
    let frame = 0
    let last = 0

    const write = () => {
      target.style.setProperty('--vhs-px', now.x.toFixed(3))
      target.style.setProperty('--vhs-py', now.y.toFixed(3))
      target.style.setProperty('--vhs-h', now.h.toFixed(3))
    }
    const step = (time: number) => {
      // The same smoothing at any frame rate: after SMOOTHING ms the box has moved 63% of the
      // way, after 3 × SMOOTHING about 95%.
      const share = 1 - Math.exp(-(last ? time - last : 16) / SMOOTHING)
      last = time
      now.x += (goal.x - now.x) * share
      now.y += (goal.y - now.y) * share
      now.h += (goal.h - now.h) * share
      const settled =
        Math.abs(goal.x - now.x) + Math.abs(goal.y - now.y) + Math.abs(goal.h - now.h) < 0.002
      if (settled) Object.assign(now, goal)
      write()
      if (!settled) {
        frame = requestAnimationFrame(step)
        return
      }
      frame = 0
      last = 0
      // Back at rest: hand the box back to the CSS (focus pose, scroll tilt, resting angle).
      if (goal.h === 0) target.removeAttribute('data-vhs-active')
    }
    const run = () => {
      if (!frame) frame = requestAnimationFrame(step)
    }
    const aim = (e: PointerEvent) => {
      const r = box.getBoundingClientRect()
      goal.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1)
      goal.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1)
    }

    const enter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || reducedMotion()) return
      aim(e)
      // Coming from rest, start the lean where the pointer already is; --vhs-h does the easing.
      if (now.h === 0) Object.assign(now, { x: goal.x, y: goal.y })
      goal.h = 1
      write()
      target.setAttribute('data-vhs-active', '')
      run()
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || goal.h === 0) return
      aim(e)
      run()
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || goal.h === 0) return
      goal.h = 0
      run()
    }
    target.addEventListener('pointerenter', enter)
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      target.removeEventListener('pointerenter', enter)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerleave', leave)
    }
  }, [])

  const poster = imageUrl(movie.poster_path, 'w342')
  const year = releaseYear(movie.release_date)

  return (
    <span ref={scene} aria-hidden="true" className="vhs-scene">
      <span className="vhs-box">
        <span className="vhs-face vhs-top" />
        <span className="vhs-face vhs-bottom" />
        {/* The open end: the cassette, with the title on its genre-colored label. */}
        <span className="vhs-face vhs-edge">
          <span className="vhs-edge-label">{movie.title}</span>
        </span>
        {/* The spine: genre band with the year ("’79"), the title, the store's barcode. */}
        <span className="vhs-face vhs-spine">
          <span className="vhs-spine-band">{year && `’${year.slice(2)}`}</span>
          <span className="vhs-spine-title">{movie.title}</span>
          <span className="vhs-spine-label">
            <span className="vhs-barcode" />
          </span>
        </span>
        {/* The front cover: the poster (or an empty placeholder) and the genre sticker. */}
        <span className="vhs-face vhs-front">
          {poster ? (
            <LoadingImage src={poster} alt="" loading="lazy" />
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
  )
}
