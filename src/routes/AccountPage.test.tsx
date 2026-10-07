// Tests for the Account page: "Save my picks" keeps a guest's picks on this device.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('account (ADR-0022)', () => {
  it('Save my picks keeps guest picks on this device', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search?q=thing', { features: { searchPage: true } })
    await user.click(await screen.findByRole('button', { name: 'Want to see The Thing' }))
    await act(() => router.navigate('/account'))
    expect(screen.getByText(/not saved yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save my picks' }))
    expect(await screen.findByText('Saved on this device')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('saved on this device')
    const signInCard = screen.getByRole('region', { name: 'Sign in to keep your cuts' })
    expect(within(signInCard).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    )

    await act(() => router.navigate('/lists'))
    const lists = screen.getByRole('navigation', { name: 'Lists' })
    expect(
      await within(lists).findByRole('link', { name: /Want to see.*1 film/ }),
    ).toBeInTheDocument()
  })
})
