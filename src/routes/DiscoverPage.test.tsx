// Tests for Home (signed in): its three panels in order and in one grid (ADR-0035), and the
// Discovery panel: popular films without likes, scored picks with a match and the reason with
// likes.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'
import { searchFixture } from '../test/msw/fixtures'
import { server } from '../test/msw/server'

/** The first (top-ranked) pick in the Discovery panel, once the picks have loaded. */
async function firstPick() {
  const panel = await screen.findByRole('region', { name: 'Discovery' })
  // The first row's link (the skeleton rows are aria-hidden, so they never match).
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
    expect(document.querySelector('[data-loading-section="rows"]')).toBeInTheDocument()
    expect(await firstPick()).toHaveAccessibleName(/^The Thing/)
  })

  it('shows the picks as compact rows, with no featured card or credits', async () => {
    renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
    ).toBeInTheDocument()
    expect(await firstPick()).toHaveAccessibleName(/^The Thing/)
    // The big featured card is gone (owner, 2026-10-09): the top pick is the first row.
    expect(screen.queryByText(/featured deep cut/i)).not.toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'Discovery' })
    const alien = within(panel).getByRole('link', { name: /Alien.*1979 · Horror/ })
    // Rows are compact (ADR-0035): no director/writer lines, so no extra details calls.
    expect(alien).not.toHaveTextContent('Director:')
    // The title is cut to one line visually; the full title stays in the page and on hover.
    const title = within(alien).getByText('Alien')
    expect(title).toHaveClass('truncate')
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
    const panel = screen.getByRole('region', { name: 'Discovery' })
    expect(within(panel).getByRole('link', { name: /Halloween/ })).toHaveTextContent(/\d+% match/)
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
    const feature = await firstPick()
    expect(feature).toHaveTextContent('Because you liked Friday the 13th')
    const titles = screen
      .getAllByRole('link', { name: /Friday the 13th Part/ })
      .map((l) => l.textContent)
    expect(titles.join(' ')).toMatch(/Part 2/)
    expect(titles.join(' ')).toMatch(/Part III/)
    expect(screen.queryByText(/Announced/)).not.toBeInTheDocument()
  })
})
