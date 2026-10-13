// Tests for the signed-out landing page (ADR-0034, ADR-0035): the three explainer panels match
// Home's panels, the shell has only the logo and Sign in, and the header's Sign in leads to Home.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SIGNED_OUT } from '../adapters/SessionProvider'
import { findToast, renderRoute } from '../test/renderRoute'

const PANEL_HEADINGS = ['Top Ten', 'Movies I want to watch', 'Discovery']

describe('landing page (signed out)', () => {
  it('explains the three ideas in the same panels, and grid, as Home', async () => {
    renderRoute('/', { initialSession: SIGNED_OUT })
    await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' })
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(PANEL_HEADINGS)
    for (const name of PANEL_HEADINGS) {
      const panel = screen.getByRole('region', { name })
      // The illustration is decorative; the copy says what the panel is for.
      expect(panel.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
      expect(within(panel).getByRole('paragraph')).not.toBeEmptyDOMElement()
    }
    expect(screen.getByRole('region', { name: 'Top Ten' }).closest('ul')).toHaveClass(
      'lg:grid-cols-3',
    )
  })

  it('shows only the logo and Sign in: no search, no films', async () => {
    renderRoute('/', { initialSession: SIGNED_OUT })
    await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /View details/ })).not.toBeInTheDocument()
  })

  it('has no Sign in of its own; the header’s leads to the sign-in page, then to Home', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/', { initialSession: SIGNED_OUT })
    const main = await screen.findByRole('main')
    // The page itself has no call to action (owner, 2026-10-11).
    expect(within(main).queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' }))
    await user.click(await screen.findByRole('button', { name: /Continue with a demo account/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    // Home's real panels, with the account menu in the header.
    expect(await screen.findByRole('button', { name: 'Account menu for Mike' })).toBeInTheDocument()
    expect(await findToast('Signed in as Mike.')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Movies I want to watch' })).getByRole('link', {
        name: 'See all',
      }),
    ).toBeInTheDocument()
  })
})
