// Tests for registration (ADR-0030): every field validated at once with focus on the first
// problem, a valid form making a practice account that keeps the person's picks, the honest
// "practice" label, failures, and the links between Sign in and Create an account.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMockSessionProvider } from '../adapters/local/MockSessionProvider'
import type { SessionProvider } from '../adapters/SessionProvider'
import { renderRoute } from '../test/renderRoute'

const PASSWORD = 'correct horse battery'

// Fills the three fields; any of them can be overridden (an empty string leaves it blank).
async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { name = 'Ada Lovelace', email = 'ada@example.com', password = PASSWORD } = {},
) {
  // The page is lazy-loaded: wait for it before typing.
  await screen.findByRole('heading', { level: 1, name: 'Create an account' })
  if (name) await user.type(screen.getByRole('textbox', { name: 'Name' }), name)
  if (email) await user.type(screen.getByRole('textbox', { name: 'Email' }), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
}

describe('registration (ADR-0030)', () => {
  it('says it is practice only, never a real account', async () => {
    renderRoute('/register')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create an account' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No real account is created/)).toBeInTheDocument()
  })

  it('shows every problem at once and focuses the first one', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/register')
    await fill(user, { name: '', email: 'ada@', password: 'too short' })
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const name = screen.getByRole('textbox', { name: 'Name' })
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAccessibleDescription(/Enter your name\./)
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription(
      'Enter an email address like name@example.com.',
    )
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      /Use at least 15 characters\./,
    )
    expect(router.state.location.pathname).toBe('/register')
  })

  it('registers, carries picks over and returns to where sign-in started', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search?q=thing')
    await user.click(await screen.findByRole('button', { name: 'Want to see The Thing' }))
    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' }))
    await user.click(await screen.findByRole('link', { name: 'Create an account' }))

    expect(await screen.findByText(/Your 1 unsaved pick comes with your new account/)).toBeVisible()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(router.state.location.search).toBe('?q=thing')
    expect(
      await screen.findByText(/Signed in as Ada\. Your 1 pick is in your account\./),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Want to see The Thing' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
  })

  it('shows and hides the password', async () => {
    const user = userEvent.setup()
    renderRoute('/register')
    const password = await screen.findByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
  })

  it('shows an error and changes nothing when registration fails', async () => {
    const user = userEvent.setup()
    const failing: SessionProvider = {
      ...createMockSessionProvider(),
      register: () => Promise.reject(new Error('offline')),
    }
    const { router } = renderRoute('/register', { sessionProvider: failing })
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Registration didn’t finish. Nothing was changed.',
    )
    expect(router.state.location.pathname).toBe('/register')
  })

  it('shows the practice account on the Account page', async () => {
    renderRoute('/account', {
      initialSession: {
        kind: 'account',
        account: { id: 'practice', name: 'Ada Lovelace', method: 'practice' },
      },
    })
    expect(await screen.findByText('Practice account, made on this device')).toBeInTheDocument()
  })

  it('sends someone who is already signed in to their account', async () => {
    const { router } = renderRoute('/register', {
      initialSession: {
        kind: 'account',
        account: { id: 'demo', name: 'Mike Curts', method: 'demo' },
      },
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'))
  })
})
