import { screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('useRouteFocus', () => {
  it('does not steal focus on first load', () => {
    renderRoute('/lists')
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus()
  })

  it('focuses the new page heading after navigation', async () => {
    const { router } = renderRoute('/lists')
    await act(() => router.navigate('/search'))
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toHaveFocus()
  })

  it('waits for a heading that renders after data loads', async () => {
    const { router } = renderRoute('/lists')
    await act(() => router.navigate('/movie/1091'))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'The Thing' })).toHaveFocus(),
    )
  })
})
