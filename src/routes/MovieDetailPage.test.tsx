// Tests for the Detail page: tag toggles follow the rules, streaming logos aren't interactive,
// back navigation (top and bottom buttons), the disliked marker in Search, and "not found" for bad ids.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

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

  it('the back button below the tags returns to the previous screen', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/lists')
    await act(() => router.navigate('/movie/1091'))
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/lists'))
  })

  it.each(['/movie/abc', '/movie/-1', '/movie/999'])('shows not found for %s', async (path) => {
    renderRoute(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Film not found' }),
    ).toBeInTheDocument()
  })
})
