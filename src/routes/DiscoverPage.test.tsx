// Tests for Home's recommendation area: popular films without likes, scored picks with likes,
// (scored picks with a match and the reason).
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'
import { candidateDetailFixtures, movieFixture, searchFixture } from '../test/msw/fixtures'
import { server } from '../test/msw/server'

describe('home', () => {
  it('puts personal-list areas before its compact recommendation section', async () => {
    renderRoute('/')
    const topTen = await screen.findByRole('heading', { level: 2, name: 'Top Ten' })
    const watchlist = screen.getByRole('heading', { level: 2, name: 'Movies I want to watch' })
    const recommendations = screen.getByRole('heading', { level: 2, name: 'Go a little deeper' })
    expect(topTen.compareDocumentPosition(watchlist)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(watchlist.compareDocumentPosition(recommendations)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('returns a retired Discover URL to Home', async () => {
    const { router } = renderRoute('/discover')
    await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('reserves both list sections while the film list loads', async () => {
    server.use(
      http.get('/api/tmdb/discover/movie', async () => {
        await delay(250)
        return HttpResponse.json(searchFixture)
      }),
    )

    renderRoute('/')
    expect(await screen.findByRole('status')).toHaveTextContent('Finding films…')
    expect(document.querySelector('[data-loading-section="featured"]')).toBeInTheDocument()
    expect(document.querySelector('[data-loading-section="grid"]')).toBeInTheDocument()
    await screen.findByRole('link', { name: /Today’s featured deep cut.*The Thing/ })
  })

  it('reveals films before secondary credits and reserves the late content space', async () => {
    // Hold only the featured film's details. Its poster should remain available for an early LCP,
    // while the fixed-height credit container prevents the late names from shifting the card.
    server.use(
      http.get('/api/tmdb/movie/:id', async ({ params }) => {
        if (params.id === String(movieFixture.id)) {
          await delay(750)
          return HttpResponse.json(movieFixture)
        }
        const candidate = candidateDetailFixtures[Number(params.id)]
        return candidate ? HttpResponse.json(candidate) : undefined
      }),
    )

    renderRoute('/')
    const feature = await screen.findByRole('link', {
      name: /Today’s featured deep cut.*The Thing/,
    })
    await screen.findByRole('link', { name: /Alien.*1979 · Horror/ })
    expect(document.querySelector('[data-loading-section="grid"]')).not.toBeInTheDocument()
    expect(document.querySelector('[data-loading-section="featured"]')).not.toBeInTheDocument()
    expect(feature.querySelector('[data-credit-lines]')).toHaveClass('min-h-10')
    expect(feature).not.toHaveTextContent('Director: John Carpenter')
    await waitFor(() => expect(feature).toHaveTextContent('Director: John Carpenter'))
  })

  it('shows a feature card and a poster grid', async () => {
    renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
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
    await act(() => router.navigate('/'))
    expect(
      await screen.findByRole('link', { name: /Today’s featured deep cut.*Alien/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /The Thing/ })).not.toBeInTheDocument()
  })

  it.each(['?genres=27,53', '?genres=27;DROP', '?genres='])(
    'ignores %s: favourite genres are gone (ADR-0032)',
    async (qs) => {
      renderRoute(`/${qs}`)
      expect(
        await screen.findByText('Like a few films to tune these picks to you.'),
      ).toBeInTheDocument()
    },
  )
})

describe('home with likes (ADR-0026)', () => {
  it('ranks films recommended by your likes, with a real match and the reason', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Like' }))
    // Detail stages tag changes until Save.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/'))

    const feature = await screen.findByRole('link', { name: /Today’s featured deep cut/ })
    // Tuned picks drop the "like a few films" hint.
    expect(
      screen.queryByText('Like a few films to tune these picks to you.'),
    ).not.toBeInTheDocument()
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

describe('home with a liked film in a series (ADR-0032)', () => {
  it('suggests the released sequels, but not an undated announced one', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/4488')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Like' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/'))

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
