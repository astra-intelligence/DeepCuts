// Tests for the weights lab: sliders, settings in the URL, reset, and the feature flag.
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

/** Likes The Thing on its Detail page, then opens `path`, as a person would. */
async function likeThenOpen(path: string, options: Parameters<typeof renderRoute>[1] = {}) {
  const user = userEvent.setup()
  const rendered = renderRoute('/movie/1091', options)
  const group = await screen.findByRole('group', { name: 'Your tags' })
  await user.click(within(group).getByRole('button', { name: 'Like' }))
  // Detail stages tag changes until Save.
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText(/^Saved\./)
  await act(() => rendered.router.navigate(path))
  return { user, ...rendered }
}

describe('weights lab (ADR-0026)', () => {
  it('asks for likes first when there are none', async () => {
    renderRoute('/lab/weights')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tune the weights' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Like a few films first/)).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('shows a labelled, described slider per part and the ranked picks', async () => {
    await likeThenOpen('/lab/weights')
    const support = await screen.findByRole('slider', { name: 'Recommended by your likes' })
    expect(support).toHaveValue('22')
    expect(support).toHaveAccessibleDescription(
      'How many of your liked films recommend it, or share its series.',
    )
    // Ten score parts (ADR-0032) plus genre variety.
    expect(screen.getAllByRole('slider')).toHaveLength(11)
    expect(screen.getByRole('slider', { name: 'Same writer' })).toHaveValue('5')
    expect(screen.getByRole('slider', { name: 'Same series' })).toHaveValue('7')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(0)
    // At the defaults nothing has moved.
    for (const row of rows) expect(row).toHaveTextContent(/^1?\d.*–\d+%/)
    expect(screen.getByText(/support: 0\.22/)).toBeInTheDocument()
  })

  it('keeps settings in the URL, scales them to 100%, and ignores bad values', async () => {
    await likeThenOpen(
      '/lab/weights?support=50&genre=50&quality=0&deepCut=0&decade=0&language=0&keywords=0&director=0&writer=0&series=0&diversity=999',
    )
    expect(await screen.findByRole('slider', { name: 'Genre fit' })).toHaveValue('50')
    // Out-of-range diversity falls back to the default 5.
    expect(screen.getByRole('slider', { name: 'Genre variety' })).toHaveValue('5')
    const settings = screen.getByText(/support: 0\.50/)
    expect(settings).toHaveTextContent('genre: 0.50')
    expect(settings).toHaveTextContent('diversityPenalty: 0.05')
  })

  it('updates the URL from the keyboard and resets to the defaults', async () => {
    const { user, router } = await likeThenOpen('/lab/weights')
    const deepCut = await screen.findByRole('slider', { name: 'Deep cut' })
    await act(() => deepCut.focus())
    await user.keyboard('{ArrowRight}')
    expect(router.state.location.search).toContain('deepCut=13')
    expect(deepCut).toHaveValue('13')

    await user.click(screen.getByRole('link', { name: 'Reset to defaults' }))
    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('slider', { name: 'Deep cut' })).toHaveValue('12')
  })

  it('warns when every weight is zero', async () => {
    await likeThenOpen(
      '/lab/weights?support=0&genre=0&quality=0&deepCut=0&decade=0&language=0&keywords=0&director=0&writer=0&series=0',
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Every weight is at zero')
  })

  it('is linked from Discover once there are picks', async () => {
    const { user, router } = await likeThenOpen('/discover')
    await user.click(await screen.findByRole('link', { name: 'Tune the weights' }))
    expect(router.state.location.pathname).toBe('/lab/weights')
  })

  it('does not exist outside the dev server: the old address goes to Discover', async () => {
    const { router } = renderRoute('/discover/weights', { features: { labs: false } })
    await waitFor(() => expect(router.state.location.pathname).toBe('/discover'))
    renderRoute('/lab/weights', { features: { labs: false } })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeVisible()
  })

  it('sends the old address to the lab on the dev server', async () => {
    const { router } = renderRoute('/discover/weights')
    await waitFor(() => expect(router.state.location.pathname).toBe('/lab/weights'))
  })
})
