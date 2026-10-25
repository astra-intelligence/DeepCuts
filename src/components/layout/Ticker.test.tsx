// Tests for the ticker: screen readers get each item once, the scrolling copy is hidden, and it
// only scrolls after a mouse rests on it for three seconds (never on touch).
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Ticker, TICKER_HOVER_DELAY } from './Ticker'

const ITEMS = ['Top Ten: 3 of 10 ranked', 'Watchlist: 12 films']

describe('Ticker', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lists each item once for screen readers and hides the loop', () => {
    const { container } = render(<Ticker items={ITEMS} />)
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(ITEMS)
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      'Top Ten: 3 of 10 ranked',
    )
  })

  it('renders nothing without items', () => {
    const { container } = render(<Ticker items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('starts scrolling only after a mouse rests on it for three seconds', () => {
    const { container } = render(<Ticker items={ITEMS} />)
    const band = container.firstElementChild as HTMLElement
    const track = band.querySelector('[aria-hidden="true"]') as HTMLElement
    fireEvent.pointerEnter(band, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(TICKER_HOVER_DELAY - 1))
    expect(track).not.toHaveAttribute('data-playing')
    act(() => vi.advanceTimersByTime(1))
    expect(track).toHaveAttribute('data-playing')
    fireEvent.pointerLeave(band, { pointerType: 'mouse' })
    expect(track).not.toHaveAttribute('data-playing')
  })

  it('never scrolls on touch', () => {
    const { container } = render(<Ticker items={ITEMS} />)
    const band = container.firstElementChild as HTMLElement
    fireEvent.pointerEnter(band, { pointerType: 'touch' })
    act(() => vi.advanceTimersByTime(TICKER_HOVER_DELAY * 2))
    expect(band.querySelector('[data-playing]')).toBeNull()
  })

  it('cancels a pending start when the pointer leaves early', () => {
    const { container } = render(<Ticker items={ITEMS} />)
    const band = container.firstElementChild as HTMLElement
    fireEvent.pointerEnter(band, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(1000))
    fireEvent.pointerLeave(band, { pointerType: 'mouse' })
    act(() => vi.advanceTimersByTime(TICKER_HOVER_DELAY))
    expect(band.querySelector('[data-playing]')).toBeNull()
  })
})
