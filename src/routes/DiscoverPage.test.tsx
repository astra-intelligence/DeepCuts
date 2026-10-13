// Tests for Home (signed in): its three panels in order and in one grid (ADR-0035), the Top Ten
// in its ranked order (ADR-0036), and the
// Discovery panel: popular films without likes, scored picks with a match and the reason with
// likes.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createLocalTopTenRepository } from '../adapters/local/LocalTopTenRepository'
import { renderRoute } from '../test/renderRoute'
import { searchFixture } from '../test/msw/fixtures'
import { server } from '../test/msw/server'

/** The first (top-ranked) pick in the Discovery panel, once the picks have loaded. */
async function firstPick() {
  const panel = await screen.findByRole('region', { name: 'Discovery' })
  // The first tile's link (the skeleton tiles are aria-hidden, so they never match).
  const [first] = await within(panel).findAllByRole('listitem')
  if (!first) throw new Error('no picks')
  return within(first).getByRole('link')
}

describe('home', () => {
  it('shows Top Ten, the watchlist and Discovery as panels, in that order, in one grid', async () => {
    renderRoute('/')
    const topTen = await screen.findByRole('heading', { level: 2, name: 'Top Ten' })
    const watchlist = screen.getByRole('heading', { level: 2, name: 'Movies I want to watch' })
    const recommendations = screen.getByRole('heading', { level: 2, name: 'Discovery' })
    expect(topTen.compareDocumentPosition(watchlist)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(watchlist.compareDocumentPosition(recommendations)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    // One list of three panels: stacked on phones, three columns from `lg` (ADR-0035).
    const grid = topTen.closest('ul')
    expect(grid).toHaveClass('lg:grid-cols-3')
    expect(grid?.children).toHaveLength(3)
  })

  it('returns a retired Discover URL to Home', async () => {
    const { router } = renderRoute('/discover')
    await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' })
    expect(router.state.location.pathname).toBe('/')
  })

  it('reserves the picks while the film list loads', async () => {
    server.use(
      http.get('/api/tmdb/discover/movie', async () => {
        await delay(250)
        return HttpResponse.json(searchFixture)
      }),
    )

    renderRoute('/')
    expect(await screen.findByRole('status')).toHaveTextContent('Finding films…')
    expect(document.querySelector('[data-loading-section="grid"]')).toBeInTheDocument()
    expect(await firstPick()).toHaveAccessibleName(/^The Thing/)
  })

  it('shows the picks as VHS cassettes, two across, with credits and no featured card', async () => {
    renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
    ).toBeInTheDocument()
    expect(await firstPick()).toHaveAccessibleName(/^The Thing/)
    // The big featured card is gone (owner, 2026-10-09): the top pick is the first cassette.
    expect(screen.queryByText(/featured deep cut/i)).not.toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'Discovery' })
    expect(within(panel).getByRole('list')).toHaveClass('grid-cols-2')
    const alien = within(panel).getByRole('link', { name: /Alien.*1979 · Horror/ })
    // Each box wears its VHS genre sticker, which stays out of the link's accessible name.
    expect(alien.querySelector('[data-genre-sticker="horror"]')).toHaveTextContent('Horror')
    // Director and writer fill in from the film's details, without any likes.
    await waitFor(() => expect(alien).toHaveTextContent('Director: Ridley Scott'))
    expect(alien).toHaveTextContent('Writer: Dan O’Bannon')
    // The title is clamped to two lines visually; the full title stays in the page and on hover.
    const title = within(alien).getByRole('heading', { level: 3, name: 'Alien' })
    expect(title).toHaveClass('line-clamp-2')
    expect(title).toHaveAttribute('title', 'Alien')
  })

  it('the Top Ten starts with a hint, and shows a film added from Detail', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    const panel = await screen.findByRole('region', { name: 'Top Ten' })
    expect(within(panel).getByText(/Add a film from its details page/)).toBeInTheDocument()

    await act(() => router.navigate('/movie/1091'))
    await user.click(await screen.findByRole('button', { name: 'Add to your Top 10' }))
    await screen.findByText('This is one of your top 10!')
    await act(() => router.navigate('/'))
    const updated = await screen.findByRole('region', { name: 'Top Ten' })
    expect(
      await within(updated).findByRole('link', { name: /^#1 The Thing.*1982 · Horror/ }),
    ).toBeInTheDocument()
    expect(within(updated).queryByText(/Add a film from its details page/)).not.toBeInTheDocument()
  })

  it('shows the Top Ten in its ranked order, numbered, as an ordered list', async () => {
    const topTen = createLocalTopTenRepository('account-demo-top-ten')
    await topTen.add(348) // Alien
    await topTen.add(1091) // The Thing
    renderRoute('/')
    const panel = await screen.findByRole('region', { name: 'Top Ten' })
    await within(panel).findByRole('link', { name: /^#2 The Thing/ })
    const links = within(panel).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/movie/348', '/movie/1091'])
    expect(links[0]).toHaveAccessibleName(/^#1 Alien/)
    expect(links[0]?.closest('ol')).toHaveClass('grid-cols-2')
  })

  it('shows up to four watchlist films as cassettes, with See all', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Want to see' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/'))
    const panel = await screen.findByRole('region', { name: 'Movies I want to watch' })
    const thing = await within(panel).findByRole('link', { name: /The Thing.*1982 · Horror/ })
    expect(thing.querySelector('[data-genre-sticker="horror"]')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/lists?tag=watchlist',
    )
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
    expect(await firstPick()).toHaveAccessibleName(/^Alien/)
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

    const feature = await firstPick()
    // Tuned picks drop the "like a few films" hint.
    expect(
      screen.queryByText('Like a few films to tune these picks to you.'),
    ).not.toBeInTheDocument()
    expect(feature).toHaveTextContent(/\d+% match/)
    expect(feature).toHaveTextContent('Because you liked The Thing')
    // The re-rank loaded the top candidates' directors (ADR-0028): The Fog shares John Carpenter
    // with The Thing, which lifts it to the top spot.
    expect(feature).toHaveTextContent('The Fog')
    // Picks only appear once both passes are in, so the top pick never changes under you.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // Tiles name the director and writer; the old "Directed by X, like Y" reason is gone.
    await waitFor(() => expect(feature).toHaveTextContent('Director: John Carpenter'))
    expect(feature).not.toHaveTextContent('Directed by')
    const panel = screen.getByRole('region', { name: 'Discovery' })
    const halloween = within(panel).getByRole('link', { name: /Halloween/ })
    expect(halloween).toHaveTextContent(/\d+% match/)
    await waitFor(() => expect(halloween).toHaveTextContent('Writers: John Carpenter, Debra Hill'))
    // The liked film itself is never recommended back.
    expect(screen.queryByRole('link', { name: /^The Thing/ })).not.toBeInTheDocument()
  })
})

describe('home with a liked film in a series (ADR-0032, ADR-0037)', () => {
  it('suggests the next released film in the series, not later ones or an announced one', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/4488')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Like' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/'))

    // TMDB recommends nothing for it here, so the pick comes from the series: only the next film.
    const feature = await firstPick()
    expect(feature).toHaveTextContent('Because you liked Friday the 13th')
    const titles = screen
      .getAllByRole('link', { name: /Friday the 13th Part/ })
      .map((l) => l.textContent)
    expect(titles.join(' ')).toMatch(/Part 2/)
    expect(titles.join(' ')).not.toMatch(/Part III/)
    expect(screen.queryByText(/Announced/)).not.toBeInTheDocument()
  })
})
