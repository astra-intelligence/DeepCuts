import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('navigation', () => {
  it('marks the current destination with aria-current', async () => {
    renderRoute('/search')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Search' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current')
  })

  it('shows the error page for unknown routes', async () => {
    renderRoute('/nope')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument()
  })

  it('renders the placeholder pages', async () => {
    renderRoute('/lists')
    expect(screen.getByRole('heading', { level: 1, name: 'My Lists' })).toBeInTheDocument()
  })
})

describe('search → detail', () => {
  const box = () => screen.getByRole('combobox', { name: 'Find a movie to view and tag' })

  it('/ lands on Search (ADR-0019 amendment)', async () => {
    const { router } = renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Find your next film' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/search')
  })

  it('searches from the URL, lists results, and opens a film', async () => {
    const user = userEvent.setup()
    renderRoute('/search?q=thing')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Results for “thing”' }),
    ).toBeInTheDocument()
    const link = await screen.findByRole('link', { name: /The Thing.*1982 · Horror/ })
    expect(screen.getByRole('status')).toHaveTextContent('1 result')
    await user.click(link)

    expect(await screen.findByRole('heading', { level: 1, name: 'The Thing' })).toBeInTheDocument()
    expect(screen.getByText('1982 · 1h 49m · Horror, Science Fiction')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Disney Plus' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Apple TV' })).toBeInTheDocument()
    expect(screen.getByLabelText('Rated R')).toBeInTheDocument()
  })

  it('typing in the header search updates the Search results', async () => {
    const user = userEvent.setup()
    renderRoute('/search')
    await user.type(box(), 'alien')
    await screen.findByRole('option', { name: /Alien/ })
    // The open suggestion list hides the page from assistive tech; Escape closes it.
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('link', { name: /Alien.*1979/ })).toBeInTheDocument()
  })

  it('keeps every keystroke when typing fast (regression)', async () => {
    const user = userEvent.setup({ delay: null })
    renderRoute('/search')
    await user.type(box(), 'the thing')
    expect(box()).toHaveValue('the thing')
  })

  it('ignores over-long ?q values', () => {
    renderRoute(`/search?q=${'x'.repeat(101)}`)
    expect(box()).toHaveValue('')
  })

  it('picking an autocomplete suggestion opens the film', async () => {
    const user = userEvent.setup()
    renderRoute('/lists')
    await user.type(box(), 'thing')
    await user.click(await screen.findByRole('option', { name: /The Thing/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'The Thing' })).toBeInTheDocument()
  })

  it('Enter (Find) opens the best match', async () => {
    const user = userEvent.setup()
    renderRoute('/lists')
    await user.type(box(), 'alien')
    await screen.findByRole('option', { name: /Alien/ })
    await user.keyboard('{Enter}')
    // Alien has no detail fixture, so the detail route reports it as not found.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Film not found' }),
    ).toBeInTheDocument()
  })

  it('arrow keys + Enter open the highlighted suggestion, not the first match', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/lists')
    await user.type(box(), 'a') // too short to search
    await user.type(box(), 'l')
    await screen.findByRole('option', { name: /Alien/ })
    await user.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/movie/348'))
  })

  it('quick add toggles Want to see', async () => {
    const user = userEvent.setup()
    renderRoute('/search?q=thing')
    const add = await screen.findByRole('button', { name: 'Want to see The Thing' })
    expect(add).toHaveAttribute('aria-pressed', 'false')
    await user.click(add)
    await waitFor(() => expect(add).toHaveAttribute('aria-pressed', 'true'))
    expect(add).toHaveTextContent('Added')
  })
})

describe('movie detail', () => {
  it('provider badges are not interactive (ADR-0018)', async () => {
    renderRoute('/movie/1091')
    const section = await screen.findByRole('region', { name: /Where to watch/ })
    await within(section).findByRole('img', { name: 'Disney Plus' })
    expect(within(section).queryAllByRole('link')).toHaveLength(0)
    expect(within(section).queryAllByRole('button')).toHaveLength(0)
  })

  it('tag toggles follow the ADR-0017 rules', async () => {
    const user = userEvent.setup()
    renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    const btn = (name: string) => within(group).getByRole('button', { name })
    await user.click(btn('Want to see'))
    await waitFor(() => expect(btn('Want to see')).toHaveAttribute('aria-pressed', 'true'))
    await user.click(btn('Seen it'))
    await waitFor(() => expect(btn('Seen it')).toHaveAttribute('aria-pressed', 'true'))
    expect(btn('Want to see')).toHaveAttribute('aria-pressed', 'false')
    await user.click(btn('Like'))
    await user.click(btn('Dislike'))
    await waitFor(() => expect(btn('Dislike')).toHaveAttribute('aria-pressed', 'true'))
    expect(btn('Like')).toHaveAttribute('aria-pressed', 'false')
    expect(btn('Seen it')).toHaveAttribute('aria-pressed', 'true')
  })

  it('a disliked film stays in Search with a marker (ADR-0017 amendment)', async () => {
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
    await act(() => router.navigate('/search?q=thing'))
    const row = await screen.findByRole('link', { name: /The Thing/ })
    expect(within(row).getByText('Disliked')).toBeInTheDocument()
  })

  it('back returns to the previous screen, or Search on a direct visit', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    await user.click(screen.getByRole('button', { name: 'Back to previous screen' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
  })

  it.each(['/movie/abc', '/movie/-1', '/movie/999'])('shows not found for %s', async (path) => {
    renderRoute(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Film not found' }),
    ).toBeInTheDocument()
  })
})

describe('my lists', () => {
  it('shows tagged films under their tile and filters by ?tag=', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Seen it' }))
    await waitFor(() =>
      expect(within(group).getByRole('button', { name: 'Seen it' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )

    await act(() => router.navigate('/lists'))
    const lists = screen.getByRole('navigation', { name: 'Lists' })
    expect(within(lists).getByRole('link', { name: /Want to see/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByText(/will appear here/)).toBeInTheDocument()

    await user.click(await within(lists).findByRole('link', { name: /Seen it.*1 film/ }))
    expect(
      await screen.findByRole('link', { name: /The Thing.*1982 · Horror · 1h 49m · R/ }),
    ).toBeInTheDocument()
    expect(router.state.location.search).toBe('?tag=seen')
  })

  it('falls back to Want to see for an unknown ?tag=', () => {
    renderRoute('/lists?tag=hidden')
    const lists = screen.getByRole('navigation', { name: 'Lists' })
    expect(within(lists).getByRole('link', { name: /Want to see/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })
})

describe('account (ADR-0022)', () => {
  it('Save my picks keeps guest picks on this device', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search?q=thing')
    await user.click(await screen.findByRole('button', { name: 'Want to see The Thing' }))
    await act(() => router.navigate('/account'))
    expect(screen.getByText(/not saved yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save my picks' }))
    expect(await screen.findByText('Saved on this device')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('saved on this device')
    expect(screen.getByRole('button', { name: 'Coming soon' })).toBeDisabled()

    await act(() => router.navigate('/lists'))
    const lists = screen.getByRole('navigation', { name: 'Lists' })
    expect(
      await within(lists).findByRole('link', { name: /Want to see.*1 film/ }),
    ).toBeInTheDocument()
  })
})
