// Tests for the Detail page: tag toggles follow the rules, streaming logos aren't interactive,
// back navigation, the disliked marker in Search (behind its flag), and
// "not found" for bad ids.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('movie detail', () => {
  it('focuses its first button and traps Tab within the Detail experience', async () => {
    const user = userEvent.setup()
    renderRoute('/movie/1091')
    const back = await screen.findByRole('button', { name: 'Back to previous screen' })
    await waitFor(() => expect(back).toHaveFocus())

    // Shift+Tab from the first focusable control wraps to the last, then Tab returns to Back.
    await user.tab({ shift: true })
    await user.tab()
    expect(back).toHaveFocus()
  })

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
    // The rules apply to the staged selection, before anything is saved.
    await user.click(btn('Want to see'))
    expect(btn('Want to see')).toHaveAttribute('aria-pressed', 'true')
    await user.click(btn('Seen it'))
    expect(btn('Seen it')).toHaveAttribute('aria-pressed', 'true')
    expect(btn('Want to see')).toHaveAttribute('aria-pressed', 'false')
    await user.click(btn('Like'))
    await user.click(btn('Dislike'))
    expect(btn('Dislike')).toHaveAttribute('aria-pressed', 'true')
    expect(btn('Like')).toHaveAttribute('aria-pressed', 'false')
    expect(btn('Seen it')).toHaveAttribute('aria-pressed', 'true')
  })

  it('saves changes, announces them, then fades back to the source', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    const btn = (name: string) => within(group).getByRole('button', { name })
    // The 44px action slot is reserved from first paint, but no misleading action appears until
    // something changes.
    expect(document.querySelector('[data-detail-actions]')).toHaveClass('min-h-11')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    await user.click(btn('Seen it'))
    await user.click(btn('Like'))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    // Undoing every change by hand hides them again: nothing differs from what's saved.
    await user.click(btn('Seen it'))
    await user.click(btn('Like'))
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    // Save writes both tags, announces it, then closes the Detail overlay.
    await user.click(btn('Seen it'))
    await user.click(btn('Like'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Saved. The Thing: Seen it, Like.')
    // The action row stays in place for the fade and disappears only when Detail unmounts.
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))

    // What was saved is really saved: My Lists has it after the overlay closes.
    await act(() => router.navigate('/lists?tag=liked'))
    expect(await screen.findByRole('link', { name: /The Thing/ })).toBeInTheDocument()
  })

  it('a cancelled change saves nothing', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Want to see' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    await act(() => router.navigate('/lists?tag=watchlist'))
    expect(await screen.findByText(/will appear here/)).toBeInTheDocument()
  })

  it('a disliked film stays in Search with a marker (ADR-0017 amendment)', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091', { features: { searchPage: true } })
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Dislike' }))
    // Detail stages tag changes until Save.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)
    await act(() => router.navigate('/search?q=thing'))
    const row = await screen.findByRole('link', { name: /The Thing/ })
    expect(within(row).getByText('Disliked')).toBeInTheDocument()
  })

  it('back returns to the previous screen, or home (Discover) on a direct visit', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    await user.click(screen.getByRole('button', { name: 'Back to previous screen' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('Escape closes the Detail overlay with the same fade', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(document.querySelector('.detail-page')).toHaveAttribute('data-closing'),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('has one back button (top), which returns to the previous screen', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/lists')
    await act(() => router.navigate('/movie/1091'))
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    // The bottom Back button was removed once Save and Cancel arrived (owner, 2026-10-07).
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to previous screen' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/lists'))
  })

  it.each(['/movie/abc', '/movie/-1', '/movie/999'])('shows not found for %s', async (path) => {
    renderRoute(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Film not found' }),
    ).toBeInTheDocument()
  })
})
