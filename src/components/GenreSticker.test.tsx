// Tests for the VHS genre sticker: it shows the first known genre's short label, stays hidden from
// screen readers, gives each film a stable tilt and its own wear filter, and renders nothing
// without a known genre.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GenreSticker } from './GenreSticker'

const sticker = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-genre-sticker]')

describe('GenreSticker', () => {
  it('prints the first known genre’s short label and is hidden from screen readers', () => {
    const { container } = render(<GenreSticker genreIds={[999, 878, 27]} seed={1091} />)
    const el = sticker(container)
    expect(el).toHaveAttribute('data-genre-sticker', 'science-fiction')
    expect(el).toHaveTextContent('Sci-Fi')
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders nothing when no genre is known', () => {
    const { container } = render(<GenreSticker genreIds={[999]} seed={1} />)
    expect(sticker(container)).toBeNull()
  })

  it('tilts the same way for the same film, and sizes up for the featured card', () => {
    const a = sticker(render(<GenreSticker genreIds={[27]} seed={1091} />).container)
    const b = sticker(render(<GenreSticker genreIds={[27]} seed={1091} size="lg" />).container)
    expect(a?.style.rotate).toBe(b?.style.rotate)
    expect(a?.style.width).toBe('48px')
    expect(b?.style.width).toBe('72px')
  })

  it('gives each sticker its own wear filter, seeded by the film', () => {
    const { container } = render(
      <>
        <GenreSticker genreIds={[27]} seed={1091} />
        <GenreSticker genreIds={[27]} seed={348} />
      </>,
    )
    const filters = [...container.querySelectorAll('filter')]
    expect(new Set(filters.map((f) => f.id)).size).toBe(2)
    expect(filters.map((f) => f.querySelector('feTurbulence')?.getAttribute('seed'))).toEqual([
      '91',
      '48',
    ])
  })
})
