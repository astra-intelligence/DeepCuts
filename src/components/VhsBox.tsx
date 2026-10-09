// The VHS box poster: a film drawn as a 3D cardboard video sleeve, with the poster on the front,
// a printed spine, the cassette in the open end, and the VHS genre sticker on the cover.
// Design approved 2026-10-09 (tuned in the dev-only lab, /lab/vhs).
//
// The look and the motion are plain CSS in src/index.css ("VHS box posters"): this component
// only renders the faces and, for the mouse, reports where the pointer is. Purely decorative:
// the title, year and genre are always written next to the box, so it's hidden from screen
// readers. Colors come from the vhs-box component tokens and the film's genre tone (`--tone`,
// set by genreTone() on a parent).
import { useEffect, useRef } from 'react'
import { imageUrl, releaseYear, type MovieSummary } from '../api/tmdb'
import { GenreSticker } from './GenreSticker'

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

  // Mouse: write where the pointer is over the box to `--vhs-px`/`--vhs-py` on the target,
  // from -1 (left/top) to 1 (right/bottom); the CSS turns the box from those. Measured against
  // the box, not the whole target, and clamped, so the text below it counts as the bottom edge.
  // Set straight on the element rather than through React state, so moving the mouse never
  // re-renders. A native listener: the box itself is decorative and takes no events.
  useEffect(() => {
    const box = scene.current
    const target = box?.closest<HTMLElement>('[data-vhs-target]')
    if (!box || !target) return
    const clamp = (n: number) => Math.max(-1, Math.min(1, n)).toFixed(3)
    const follow = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = box.getBoundingClientRect()
      target.style.setProperty('--vhs-px', clamp(((e.clientX - r.left) / r.width) * 2 - 1))
      target.style.setProperty('--vhs-py', clamp(((e.clientY - r.top) / r.height) * 2 - 1))
    }
    target.addEventListener('pointermove', follow)
    return () => target.removeEventListener('pointermove', follow)
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
  )
}
