// Tests for the app shell: the tab bar marks the current page, and unknown URLs show the error page.
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('navigation', () => {
  it('marks the current destination with aria-current', async () => {
    renderRoute('/search')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Search' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current')
  })

  it('shows the error page for unknown routes', async () => {
    renderRoute('/nope')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument()
  })

  it('renders the placeholder pages', async () => {
    renderRoute('/lists')
    expect(screen.getByRole('heading', { level: 1, name: 'My Lists' })).toBeInTheDocument()
  })
})
