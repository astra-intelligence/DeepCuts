// VhsBox: decorative faces, and the mouse position it reports for the CSS to turn the box.
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MovieSummary } from '../api/tmdb'
import { VhsBox } from './VhsBox'

const film: Pick<MovieSummary, 'id' | 'title' | 'poster_path' | 'release_date' | 'genre_ids'> = {
  id: 1091,
  title: 'The Thing',
  poster_path: '/thing.jpg',
  release_date: '1982-06-25',
  genre_ids: [27],
}

/** Renders the box inside a link marked as its target, as Discover does. */
function renderInLink(movie = film) {
  const { container } = render(
    <a href="#film" data-vhs-target="">
      <VhsBox movie={movie} />
    </a>,
  )
  const link = container.querySelector('a')
  const box = container.querySelector<HTMLElement>('.vhs-scene')
  if (!link || !box) throw new Error('VhsBox did not render')
  return { link, box }
}

describe('VhsBox', () => {
  it('is decorative: hidden from screen readers, so the link keeps its own name', () => {
    const { box } = renderInLink()
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(box.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('prints the title on the spine and the cassette label, and the year on the spine', () => {
    const { box } = renderInLink()
    expect(box.querySelector('.vhs-spine-title')).toHaveTextContent('The Thing')
    expect(box.querySelector('.vhs-edge-label')).toHaveTextContent('The Thing')
    expect(box.querySelector('.vhs-spine-band')).toHaveTextContent('’82')
    expect(box.querySelector('[data-genre-sticker="horror"]')).toBeInTheDocument()
  })

  it('shows a placeholder and no year band text when TMDB has no poster or date', () => {
    const { box } = renderInLink({ ...film, poster_path: null, release_date: '' })
    expect(box.querySelector('img')).toBeNull()
    expect(box.querySelector('.bg-poster-placeholder')).toBeInTheDocument()
    expect(box.querySelector('.vhs-spine-band')).toBeEmptyDOMElement()
  })

  it('reports where the mouse is over the box, from -1 to 1, clamped', () => {
    const { link, box } = renderInLink()
    box.getBoundingClientRect = () => ({ left: 100, top: 0, width: 200, height: 400 }) as DOMRect
    fireEvent.pointerMove(link, { pointerType: 'mouse', clientX: 150, clientY: 300 })
    expect(link.style.getPropertyValue('--vhs-px')).toBe('-0.500')
    expect(link.style.getPropertyValue('--vhs-py')).toBe('0.500')
    // Over the text below the box: held at the bottom edge.
    fireEvent.pointerMove(link, { pointerType: 'mouse', clientX: 300, clientY: 900 })
    expect(link.style.getPropertyValue('--vhs-px')).toBe('1.000')
    expect(link.style.getPropertyValue('--vhs-py')).toBe('1.000')
  })

  it('ignores touch and pen, which turn the box by scrolling instead', () => {
    const { link } = renderInLink()
    fireEvent.pointerMove(link, { pointerType: 'touch', clientX: 10, clientY: 10 })
    expect(link.style.getPropertyValue('--vhs-px')).toBe('')
  })
})
