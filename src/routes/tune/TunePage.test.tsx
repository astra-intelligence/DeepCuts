import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

describe('tune my picks (onboarding)', () => {
  it('is hidden while the feature flag is off: /tune goes to Search, no header link', async () => {
    const { router } = renderRoute('/tune')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Find your next film' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')
    expect(screen.queryByRole('link', { name: 'Tune my picks' })).not.toBeInTheDocument()
  })

  it('step 1: choose genres, then continue with focus on the new heading', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/tune', { features: { onboarding: true } })
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    const cont = screen.getByRole('button', { name: 'Continue' })
    expect(cont).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Horror' }))
    expect(screen.getByRole('button', { name: 'Horror' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(cont)
    const h1 = await screen.findByRole('heading', { level: 1, name: 'What’s your favorite movie?' })
    await waitFor(() => expect(h1).toHaveFocus())
    expect(router.state.location.search).toBe('?step=2&genres=27')
  })

  it('step 2: a favorite picked in search survives the trip to Detail and back', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/tune?step=2&genres=27', { features: { onboarding: true } })
    expect(screen.getByRole('button', { name: /Find my taste/ })).toBeDisabled()
    await user.type(screen.getByRole('combobox', { name: 'Find a movie to view and tag' }), 'thing')
    await user.click(await screen.findByRole('option', { name: /The Thing/ }))
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    await act(() => router.navigate(-1))
    expect(await screen.findByText('Your pick')).toBeInTheDocument()
    expect(screen.getByText('The Thing')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Find my taste/ })).toBeEnabled()
  })

  it('step 3: rate cards, never skip after a dislike, finish on Discover', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/tune?step=3&genres=27', { features: { onboarding: true } })
    const card = await screen.findByRole('article', { name: 'The Thing' })
    expect(screen.getByText('Tune your picks · 1 of 3')).toBeInTheDocument()
    const tags = within(card).getByRole('group', { name: 'Your tags for The Thing' })
    await user.click(within(tags).getByRole('button', { name: /Dislike/ }))
    await waitFor(() =>
      expect(within(tags).getByRole('button', { name: /Dislike/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Next film' }))
    expect(await screen.findByRole('article', { name: 'Alien' })).toBeInTheDocument()
    expect(screen.getByText('Tune your picks · 2 of 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next film' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/discover'))
    expect(router.state.location.search).toBe('?genres=27')
  })

  it('step 3 skips the favorite and anything already disliked', async () => {
    renderRoute('/tune?step=3&favorite=1091', { features: { onboarding: true } })
    expect(await screen.findByRole('article', { name: 'Alien' })).toBeInTheDocument()
  })
})
