// Tests for Discover: the feed without likes (popular films minus dislikes) and with likes
// (scored picks with a match and the reason).
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('discover', () => {
  it('shows a feature card and a poster grid', async () => {
    renderRoute('/discover')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Found for you' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: /Today’s featured deep cut.*The Thing/ }),
    ).toBeInTheDocument()
    const grid = screen.getByRole('region', { name: 'Go a little deeper' })
    const alien = within(grid).getByRole('link', { name: /Alien.*1979 · Horror/ })
    // Each poster wears its VHS genre sticker, which stays out of the link's accessible name.
    expect(alien.querySelector('[data-genre-sticker="horror"]')).toHaveTextContent('Horror')
    // Director and writer fill in from the film's details, without any likes.
    await waitFor(() => expect(alien).toHaveTextContent('Director: Ridley Scott'))
    expect(alien).toHaveTextContent('Writer: Dan O’Bannon')
    // The title is clamped to two lines visually; the full title stays in the page and on hover.
    const title = within(alien).getByRole('heading', { level: 3, name: 'Alien' })
    expect(title).toHaveClass('line-clamp-2')
    expect(title).toHaveAttribute('title', 'Alien')
  })

  it('leaves disliked films out of the feed (ADR-0017)', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Dislike' }))
    // Detail stages tag changes until Save.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/discover'))
    expect(
      await screen.findByRole('link', { name: /Today’s featured deep cut.*Alien/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /The Thing/ })).not.toBeInTheDocument()
  })

  it.each(['?genres=27,53', '?genres=27;DROP', '?genres='])(
    'ignores %s: favourite genres are gone (ADR-0032)',
    async (qs) => {
      renderRoute(`/discover${qs}`)
      expect(await screen.findByText(/^Popular films worth staying up for\./)).toBeInTheDocument()
    },
  )
})

describe('discover with likes (ADR-0026)', () => {
  it('ranks films recommended by your likes, with a real match and the reason', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Like' }))
    // Detail stages tag changes until Save.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/discover'))

    expect(
      await screen.findByText('Picked from the films you liked, beyond the obvious.'),
    ).toBeInTheDocument()
    const feature = await screen.findByRole('link', { name: /Today’s featured deep cut/ })
    expect(feature).toHaveTextContent(/\d+% match/)
    expect(feature).toHaveTextContent('Because you liked The Thing')
    // The re-rank loaded the top candidates' directors (ADR-0028): The Fog shares John Carpenter
    // with The Thing, which lifts it to the featured spot.
    expect(feature).toHaveTextContent('The Fog')
    // Picks only appear once both passes are in, so the featured film never changes under you.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // Cards name the director and writer; the old "Directed by X, like Y" reason is gone.
    expect(feature).toHaveTextContent('Director: John Carpenter')
    expect(feature).not.toHaveTextContent('Directed by')
    const grid = screen.getByRole('region', { name: 'Go a little deeper' })
    const halloween = within(grid).getByRole('link', { name: /Halloween/ })
    await waitFor(() => expect(halloween).toHaveTextContent('Writers: John Carpenter, Debra Hill'))
    expect(halloween).toHaveTextContent('Director: John Carpenter')
    // The liked film itself is never recommended back.
    expect(screen.queryByRole('link', { name: /^The Thing/ })).not.toBeInTheDocument()
  })
})

describe('discover with a liked film in a series (ADR-0032)', () => {
  it('suggests the released sequels, but not an undated announced one', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/4488')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Like' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/discover'))

    // TMDB recommends nothing for it here, so both picks come from the series.
    const feature = await screen.findByRole('link', { name: /Today’s featured deep cut/ })
    expect(feature).toHaveTextContent('Because you liked Friday the 13th')
    const titles = screen
      .getAllByRole('link', { name: /Friday the 13th Part/ })
      .map((l) => l.textContent)
    expect(titles.join(' ')).toMatch(/Part 2/)
    expect(titles.join(' ')).toMatch(/Part III/)
    expect(screen.queryByText(/Announced/)).not.toBeInTheDocument()
  })
})
