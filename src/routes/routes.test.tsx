import { screen, within } from '@testing-library/react'
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
  it('searches from the URL, lists results, and opens a film', async () => {
    const user = userEvent.setup()
    renderRoute('/search?q=thing')
    const link = await screen.findByRole('link', { name: /The Thing.*1982/ })
    expect(screen.getByRole('status')).toHaveTextContent('1 result')
    await user.click(link)

    expect(await screen.findByRole('heading', { level: 1, name: 'The Thing' })).toBeInTheDocument()
    expect(screen.getByText('1982 · 1h 49m · Horror, Science Fiction')).toBeInTheDocument()
    expect(await screen.findByText('Disney Plus')).toBeInTheDocument()
    expect(screen.getByText('Apple TV')).toBeInTheDocument()
  })

  it('typing updates the query', async () => {
    const user = userEvent.setup()
    renderRoute('/search')
    await user.type(screen.getByRole('searchbox', { name: 'Film title' }), 'alien')
    expect(await screen.findByRole('link', { name: /Alien.*1979/ })).toBeInTheDocument()
  })

  it('keeps every keystroke when typing fast (regression)', async () => {
    const user = userEvent.setup({ delay: null })
    renderRoute('/search')
    const box = screen.getByRole('searchbox', { name: 'Film title' })
    await user.type(box, 'the thing')
    expect(box).toHaveValue('the thing')
  })

  it('ignores over-long ?q values', () => {
    renderRoute(`/search?q=${'x'.repeat(101)}`)
    expect(screen.getByRole('searchbox', { name: 'Film title' })).toHaveValue('')
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
