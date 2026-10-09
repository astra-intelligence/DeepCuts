// Tests for Search: results from `?q=`, quick add to Want to see, and input validation. The page
// is hidden behind its feature flag (2026-10-07), so most tests turn the flag on.
import { screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

// The Search page is hidden by default (FEATURES.searchPage); these tests turn it on.
const SEARCH_ON = { features: { searchPage: true } }

describe('search → detail', () => {
  const box = () => screen.getByRole('combobox', { name: 'Find a movie to view and tag' })

  it('/ is Home, and /search returns Home while the Search page is hidden', async () => {
    const { router } = renderRoute('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe('/')
    await act(() => router.navigate('/search?q=thing'))
    expect(router.state.location.pathname).toBe('/')
  })

  it('/ remains Home while the optional Search page flag is on', async () => {
    const { router } = renderRoute('/', SEARCH_ON)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('searches from the URL, lists results, and opens a film', async () => {
    const user = userEvent.setup()
    renderRoute('/search?q=thing', SEARCH_ON)
    // The page is lazy-loaded, so wait for it.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “thing”' }),
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
    renderRoute('/search', SEARCH_ON)
    await screen.findByRole('heading', { level: 1 })
    await user.type(box(), 'alien')
    await screen.findByRole('option', { name: /Alien/ })
    // The open suggestion list hides the page from assistive tech; Escape closes it.
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('link', { name: /Alien.*1979/ })).toBeInTheDocument()
  })

  it('keeps every keystroke when typing fast (regression)', async () => {
    const user = userEvent.setup({ delay: null })
    renderRoute('/search', SEARCH_ON)
    await screen.findByRole('heading', { level: 1 })
    await user.type(box(), 'the thing')
    expect(box()).toHaveValue('the thing')
  })

  it('ignores over-long ?q values', async () => {
    renderRoute(`/search?q=${'x'.repeat(101)}`, SEARCH_ON)
    await screen.findByRole('heading', { level: 1 })
    expect(box()).toHaveValue('')
  })

  it('picking an autocomplete suggestion opens the film', async () => {
    const user = userEvent.setup()
    renderRoute('/lists')
    // My Lists loads its code on demand; wait for the page (and its header search) to appear.
    await screen.findByRole('heading', { level: 1, name: 'My Lists' })
    await user.type(box(), 'thing')
    await user.click(await screen.findByRole('option', { name: /The Thing/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'The Thing' })).toBeInTheDocument()
  })

  it('Enter (Find) opens the best match', async () => {
    const user = userEvent.setup()
    renderRoute('/lists')
    // My Lists loads its code on demand; wait for the page (and its header search) to appear.
    await screen.findByRole('heading', { level: 1, name: 'My Lists' })
    await user.type(box(), 'alien')
    await screen.findByRole('option', { name: /Alien/ })
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Alien' })).toBeInTheDocument()
  })

  it('arrow keys + Enter open the highlighted suggestion, not the first match', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/lists')
    // My Lists loads its code on demand; wait for the page (and its header search) to appear.
    await screen.findByRole('heading', { level: 1, name: 'My Lists' })
    await user.type(box(), 'a') // too short to search
    await user.type(box(), 'l')
    await screen.findByRole('option', { name: /Alien/ })
    await user.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/movie/348'))
  })

  it('quick add toggles Want to see', async () => {
    const user = userEvent.setup()
    renderRoute('/search?q=thing', SEARCH_ON)
    const add = await screen.findByRole('button', { name: 'Want to see The Thing' })
    expect(add).toHaveAttribute('aria-pressed', 'false')
    await user.click(add)
    await waitFor(() => expect(add).toHaveAttribute('aria-pressed', 'true'))
    expect(add).toHaveTextContent('Added')
  })
})
