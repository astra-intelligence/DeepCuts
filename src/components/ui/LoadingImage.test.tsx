// Tests for LoadingImage: the loader shows until the image loads, stops on error, and restarts
// when the same element gets a new src.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingImage } from './LoadingImage'

describe('LoadingImage', () => {
  it('shows the loader until the image loads, then removes it', () => {
    render(<LoadingImage src="/a.jpg" alt="Poster" className="size-full" />)
    const img = screen.getByRole('img', { name: 'Poster' })
    expect(img).toHaveClass('image-loader', 'size-full')
    expect(img).toHaveAttribute('data-loading')

    fireEvent.load(img)
    expect(img).not.toHaveAttribute('data-loading')
    // It arrived while on screen, so it fades in.
    expect(img).toHaveAttribute('data-loaded', 'fade')
  })

  it('stops the loader but keeps the placeholder when the image fails', () => {
    render(<LoadingImage src="/missing.jpg" alt="Poster" />)
    const img = screen.getByRole('img', { name: 'Poster' })
    fireEvent.error(img)
    expect(img).not.toHaveAttribute('data-loading')
    expect(img).not.toHaveAttribute('data-loaded')
  })

  it('shows the loader again for a new src', () => {
    const { rerender } = render(<LoadingImage src="/a.jpg" alt="Poster" />)
    fireEvent.load(screen.getByRole('img'))
    rerender(<LoadingImage src="/b.jpg" alt="Poster" />)
    expect(screen.getByRole('img')).toHaveAttribute('data-loading')
  })
})
