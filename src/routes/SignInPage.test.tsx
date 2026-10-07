// Tests for the sign-in flow: signing in, picks moving to the account, returning to where sign-in
// started (same-app paths only), failures, and the signed-in Account page with sign out.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { createMockSessionProvider } from '../adapters/local/MockSessionProvider'
import type { SessionProvider } from '../adapters/SessionProvider'
import { renderRoute } from '../test/renderRoute'

const header = () => screen.getByRole('banner')

describe('sign in (ADR-0025)', () => {
  it('signs in from the header, carries picks over and returns to the same page', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search?q=thing')
    await user.click(await screen.findByRole('button', { name: 'Want to see The Thing' }))
    await user.click(within(header()).getByRole('link', { name: 'Sign in' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in to Deep Cuts' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Your 1 unsaved pick comes with you/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Continue with a demo account/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(router.state.location.search).toBe('?q=thing')
    const notice = await screen.findByText(/Signed in as Alex\. Your 1 pick is in your account\./)
    expect(notice).toHaveAttribute('role', 'status')
    expect(
      within(header()).getByRole('link', { name: 'Alex, open your account' }),
    ).toBeInTheDocument()
    // The account's picks load asynchronously after the session switches.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Want to see The Thing' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
  })

  it('labels the demo method as practice, never as a real account', async () => {
    renderRoute('/sign-in')
    const demo = await screen.findByRole('button', { name: /Continue with a demo account/ })
    expect(demo).toHaveTextContent('Practice sign-in. No real account is created.')
  })

  it('shows an error and changes nothing when sign-in fails', async () => {
    const user = userEvent.setup()
    const failing: SessionProvider = {
      ...createMockSessionProvider(),
      signIn: () => Promise.reject(new Error('popup closed')),
    }
    const { router } = renderRoute('/sign-in', { sessionProvider: failing })
    await user.click(await screen.findByRole('button', { name: /Continue with a demo account/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in didn’t finish. Nothing was changed.',
    )
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('sends someone who is already signed in to their account', async () => {
    const { router } = renderRoute('/sign-in', {
      initialSession: {
        kind: 'account',
        account: { id: 'demo', name: 'Alex Rivera', method: 'demo' },
      },
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
  })

  it('only returns to same-app paths (history state is untrusted)', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search')
    await act(() => router.navigate('/sign-in', { state: { from: '//evil.example' } }))
    await user.click(await screen.findByRole('button', { name: /Continue with a demo account/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
  })
})

describe('signed-in account page', () => {
  it('shows the account and signs out after confirming', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/account', {
      initialSession: {
        kind: 'account',
        account: { id: 'demo', name: 'Alex Rivera', method: 'demo' },
      },
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Alex Rivera' })).toBeInTheDocument()
    expect(screen.getByText('Signed in with the demo account')).toBeInTheDocument()
    expect(screen.getByText(/lists are kept on this device/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    const confirm = screen.getByRole('button', { name: 'Yes, sign out' })
    await waitFor(() => expect(confirm).toHaveFocus())
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await user.click(screen.getByRole('button', { name: 'Yes, sign out' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(within(header()).getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
  })
})
