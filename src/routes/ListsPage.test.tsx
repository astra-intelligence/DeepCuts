// Tests for My Lists: tagged films appear under their list, `?tag=` filters, and an unknown
// `?tag=` falls back to Want to see, and from `md` the films are cassettes, not rows.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('my lists', () => {
  it('shows tagged films under their tile and filters by ?tag=', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/movie/1091')
    const group = await screen.findByRole('group', { name: 'Your tags' })
    await user.click(within(group).getByRole('button', { name: 'Seen it' }))
    // Detail stages tag changes until Save.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText(/^Saved\./)

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

  it('falls back to Want to see for an unknown ?tag=', async () => {
    renderRoute('/lists?tag=hidden')
    const lists = await screen.findByRole('navigation', { name: 'Lists' })
    expect(within(lists).getByRole('link', { name: /Want to see/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  describe('from md (cassettes)', () => {
    // jsdom has no matchMedia, which useMediaQuery reads as a phone; pretend to be md and up.
    afterEach(() => vi.unstubAllGlobals())

    it('shows each film as a cassette with its credits', async () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(min-width: 48rem)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
      const user = userEvent.setup()
      const { router } = renderRoute('/movie/1091')
      const group = await screen.findByRole('group', { name: 'Your tags' })
      await user.click(within(group).getByRole('button', { name: 'Seen it' }))
      await user.click(screen.getByRole('button', { name: 'Save' }))
      await screen.findByText(/^Saved\./)

      await act(() => router.navigate('/lists?tag=seen'))
      const tile = await screen.findByRole('link', { name: /The Thing.*1982 · Horror/ })
      // The cassette tile, not the row: it carries the VHS box hook and the credit lines.
      expect(tile).toHaveAttribute('data-vhs-target')
      expect(tile).toHaveTextContent('Director: John Carpenter')
    })
  })
})
