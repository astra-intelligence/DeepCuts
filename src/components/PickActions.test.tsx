// Tests for PickActions (issue #76): the three quick actions are named in full with the film,
// report the pressed tag, ignore presses while saving, and swap with an Undo button that takes
// focus (and gives it back to the pressed button after an undo).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PickActions } from './PickActions'

describe('PickActions', () => {
  it('offers Want / Seen / Nope, named in full with the film, and reports the press', async () => {
    const onAct = vi.fn()
    render(<PickActions title="The Fly" onAct={onAct} onUndo={() => {}} />)
    const group = screen.getByRole('group', { name: 'Quick actions for The Fly' })
    expect(group).toHaveTextContent('WantSeenNope')
    await userEvent.click(screen.getByRole('button', { name: 'Seen it The Fly' }))
    expect(onAct).toHaveBeenCalledWith('seen')
  })

  it('ignores presses while a change is saving, without dropping focus', async () => {
    const onAct = vi.fn()
    render(<PickActions title="The Fly" busy onAct={onAct} onUndo={() => {}} />)
    const want = screen.getByRole('button', { name: 'Want to see The Fly' })
    expect(want).toHaveAttribute('aria-disabled', 'true')
    expect(want).toBeEnabled()
    await userEvent.click(want)
    expect(onAct).not.toHaveBeenCalled()
  })

  it('moves focus to Undo once stamped, and back to the pressed button after Undo', async () => {
    const { rerender } = render(<PickActions title="The Fly" onAct={() => {}} onUndo={() => {}} />)
    screen.getByRole('button', { name: 'Not for me The Fly' }).focus()
    rerender(<PickActions title="The Fly" stamped="disliked" onAct={() => {}} onUndo={() => {}} />)
    expect(screen.getByRole('button', { name: 'Undo Not for me for The Fly' })).toHaveFocus()
    rerender(<PickActions title="The Fly" onAct={() => {}} onUndo={() => {}} />)
    expect(screen.getByRole('button', { name: 'Not for me The Fly' })).toHaveFocus()
  })

  it('leaves focus alone when it is elsewhere (an undo from the toast)', () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    const { rerender } = render(
      <PickActions title="The Fly" stamped="seen" onAct={() => {}} onUndo={() => {}} />,
    )
    outside.focus()
    rerender(<PickActions title="The Fly" onAct={() => {}} onUndo={() => {}} />)
    expect(outside).toHaveFocus()
    outside.remove()
  })
})
