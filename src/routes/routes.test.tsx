import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(await screen.findByText('Disney Plus')).toBeInTheDocument()
    expect(screen.getByText('Apple TV')).toBeInTheDocument()
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
    await within(section).findByText('Disney Plus')
    expect(within(section).queryAllByRole('link')).toHaveLength(0)
    expect(within(section).queryAllByRole('button')).toHaveLength(0)
  })

  it.each(['/movie/abc', '/movie/-1', '/movie/999'])('shows not found for %s', async (path) => {
    renderRoute(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Film not found' }),
    ).toBeInTheDocument()
  })
})
