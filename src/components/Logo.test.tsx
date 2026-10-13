// Tests for the logo: one accessible image named "Deep Cuts", or nothing for assistive tech when
// it's decorative (a link around it carries the name).
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('exposes a single accessible image named "Deep Cuts"', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Deep Cuts' })).toBeInTheDocument()
  })

  it('is hidden from assistive tech when decorative', () => {
    const { container } = render(<Logo decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
