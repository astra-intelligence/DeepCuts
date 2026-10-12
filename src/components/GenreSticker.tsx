// The VHS genre sticker: a small round, sun-faded, shelf-worn genre label in the top-right corner
// of a poster, like the price-gun dots video rental stores stuck on tape boxes.
// Design approved 2026-10-07 (option C, "shelf-worn", without the peeled corner or printed ring).
//
// Colors come from tokens: the film's genre tone (`--tone`, set by genreTone() on a parent) and
// the sticker's paper and ink (tokens/component/sticker.json). The look of the face is the
// `sticker-face` utility in index.css. Purely decorative: the genre is always written under the
// poster too, so the sticker is hidden from screen readers.
import { useId } from 'react'
import { primaryGenre } from '../domain/genres'

// Diameter in pixels: 48 on cassettes; 72 (`lg`) was for the retired featured card and is
// unused on pages for now.
const SIZES = { sm: 48, lg: 72 } as const

/**
 * The genre sticker for a film, or nothing when TMDB gives no genre we know.
 * Position it from the parent with `className` (e.g. `absolute top-1.5 right-1.5`).
 * @param seed - The film's id. Each film gets its own (stable) tilt and edge wear.
 */
export function GenreSticker({
  genreIds,
  seed,
  size = 'sm',
  className = '',
}: {
  genreIds: readonly number[]
  seed: number
  size?: keyof typeof SIZES
  className?: string
}) {
  // A unique id for this sticker's wear filter. React's ids contain characters that CSS url()
  // references don't like, so keep only letters and digits.
  const filterId = `sticker-wear-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const genre = primaryGenre(genreIds)
  if (!genre) return null

  const px = SIZES[size]
  // Stuck on by hand: a slight tilt between -9° and +5°, always the same for a given film.
  const tilt = (seed % 15) - 9
  // Shrink the text for long labels so it fits well inside the circle (at most 26% of the size).
  const fontSize = Math.min(px * 0.26, (px * 0.66) / (genre.label.length * 0.66))

  return (
    <span
      aria-hidden="true"
      data-genre-sticker={genre.slug}
      className={`pointer-events-none grid place-items-center rounded-full shadow-sticker ${className}`}
      style={{ width: px, height: px, rotate: `${tilt}deg` }}
    >
      {/* Rough, worn edges: noise displaces the face's outline by a couple of pixels. The noise
          seed comes from the film, so no two stickers wear the same way. */}
      <svg className="absolute size-0" focusable="false">
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={seed % 100}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      {/* Two layers share one grid cell: the face, and the printed label on top. The face's
          filter lifts it into a later paint layer, so the label is `relative` to stay above it. */}
      <span
        className="col-start-1 row-start-1 size-full rounded-full sticker-face"
        style={{ filter: `url(#${filterId})` }}
      />
      <span
        className="relative col-start-1 row-start-1 font-brand leading-none font-extrabold tracking-wide whitespace-nowrap text-sticker-ink/80 uppercase mix-blend-multiply"
        style={{ fontSize }}
      >
        {genre.label}
      </span>
    </span>
  )
}
