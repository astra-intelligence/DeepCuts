import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('exposes a single accessible image named "Deep Cuts"', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Deep Cuts' })).toBeInTheDocument()
  })

  it('gives each instance a unique gradient id', () => {
    const { container } = render(
      <>
        <Logo />
        <Logo />
      </>,
    )
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.id)
    expect(new Set(ids).size).toBe(2)
  })
})
