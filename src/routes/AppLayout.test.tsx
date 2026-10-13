// Tests for the app shell: the tab bar marks the current page, the account menu (the header chip
// from `md`) leads to My Lists and signs out, and unknown URLs show the error page.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('navigation', () => {
  it('marks the current destination with aria-current', async () => {
    renderRoute('/lists')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'My Lists' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('has no Search tab while the Search page is hidden', async () => {
    renderRoute('/lists')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Home', 'My Lists'])
  })

  it('shows the error page for unknown routes', async () => {
    renderRoute('/nope')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument()
  })

  it('renders the placeholder pages', async () => {
    renderRoute('/lists')
    expect(await screen.findByRole('heading', { level: 1, name: 'My Lists' })).toBeInTheDocument()
  })
})

// jsdom ignores CSS, so both the phone link and the `md` menu button are in the page here; the
// e2e tests check which one each width actually shows.
describe('account menu', () => {
  it('shows who is signed in and their tagged-film count, and opens My Lists', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Mike, account menu' }))
    const menu = await screen.findByRole('menu', { name: 'Mike, account menu' })
    expect(within(menu).getByText('Signed in with the demo account')).toBeInTheDocument()
    expect(await within(menu).findByText(/films? tagged/)).toBeInTheDocument()
    // The demo account has no settings, so no settings item (ADR-0031 A2b).
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['My Lists', 'Sign out'])
    await user.click(within(menu).getByRole('menuitem', { name: 'My Lists' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/lists'))
  })

  it('links Account settings for a passkey account', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/', {
      initialSession: {
        kind: 'account',
        account: { id: 'passkey-user', name: 'Pat Key', method: 'passkey' },
      },
    })
    await user.click(await screen.findByRole('button', { name: 'Pat, account menu' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Account settings' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
  })

  it('signs out in one press and shows the landing page', async () => {
    const user = userEvent.setup()
    renderRoute('/lists')
    await user.click(await screen.findByRole('button', { name: 'Mike, account menu' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
    ).toBeInTheDocument()
  })
})
