// Tests that focus moves to the new page's heading after navigation, but not on first load or
// when only the search parameters change.
import { screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/renderRoute'

describe('useRouteFocus', () => {
  it('does not steal focus on first load', async () => {
    renderRoute('/lists')
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveFocus()
  })

  it('focuses the new page heading after navigation', async () => {
    const { router } = renderRoute('/lists')
    await act(() => router.navigate('/account'))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Mike Curts' })
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('lets Detail focus its first control while data loads', async () => {
    const { router } = renderRoute('/lists')
    await act(() => router.navigate('/movie/1091'))
    await screen.findByRole('heading', { level: 1, name: 'The Thing' })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Back to previous screen' })).toHaveFocus(),
    )
  })

  it('does not move focus when only search params change (typing on /search)', async () => {
    const { router } = renderRoute('/search', { features: { searchPage: true } })
    // The page is lazy-loaded; wait for it, so the param change below is the only change.
    await screen.findByRole('heading', { level: 1 })
    await act(() => router.navigate('/search?q=alien', { replace: true }))
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus()
  })
})
