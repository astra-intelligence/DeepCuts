import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('discover', () => {
  it('shows a feature card and a poster grid', async () => {
    renderRoute('/discover')
    expect(screen.getByRole('heading', { level: 1, name: 'Found for you' })).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Today’s featured deep cut.*The Thing/ }),
    ).toBeInTheDocument()
    const grid = screen.getByRole('region', { name: 'Go a little deeper' })
    expect(within(grid).getByRole('link', { name: /Alien.*1979 · Horror/ })).toBeInTheDocument()
  })

  it('leaves disliked films out of the feed (ADR-0017)', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Dislike' }))
    await waitFor(() =>
      expect(within(group).getByRole('button', { name: 'Dislike' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await act(() => router.navigate('/discover'))
    expect(
      await screen.findByRole('link', { name: /Today’s featured deep cut.*Alien/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /The Thing/ })).not.toBeInTheDocument()
  })

  it('tunes to ?genres= and ignores malformed values', async () => {
    renderRoute('/discover?genres=27,53')
    expect(await screen.findByText('Tuned to the genres you picked.')).toBeInTheDocument()
  })

  it.each(['?genres=27;DROP', '?genres='])('ignores %s', async (qs) => {
    renderRoute(`/discover${qs}`)
    expect(await screen.findByText(/^Popular films worth staying up for\./)).toBeInTheDocument()
  })
})

describe('discover with likes (ADR-0026)', () => {
  it('ranks films recommended by your likes, with a real match and the reason', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Like' }))
    await waitFor(() =>
      expect(within(group).getByRole('button', { name: 'Like' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await act(() => router.navigate('/discover'))

    expect(
      await screen.findByText('Picked from the films you liked, beyond the obvious.'),
    ).toBeInTheDocument()
    const feature = await screen.findByRole('link', { name: /Today’s featured deep cut/ })
    expect(feature).toHaveTextContent(/\d+% match/)
    expect(feature).toHaveTextContent('Because you liked The Thing')
    // The liked film itself is never recommended back.
    expect(screen.queryByRole('link', { name: /^The Thing/ })).not.toBeInTheDocument()
  })
})
