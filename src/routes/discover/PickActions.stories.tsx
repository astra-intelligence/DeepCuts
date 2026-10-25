// Stories for PickActions: the quick-action strip under a Discovery pick (issue #76), at a
// phone-width tile (136px, two across at 320px), saving, and the Undo it becomes once used.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { PickActions } from './PickActions'
import type { QuickAction } from '@/components/movie/quickActions'

const meta = {
  title: 'Pages/Discover/PickActions',
  component: PickActions,
  args: { title: 'The Fly', onAct: () => {}, onUndo: () => {} },
  // A phone-width tile: the strip is at its narrowest here.
  decorators: [
    (Story) => (
      <div className="w-34">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PickActions>
export default meta
type Story = StoryObj<typeof meta>

// Stateful, as on Home: pressing an action swaps the strip for Undo, and Undo swaps it back.
function Live({ title }: { title: string }) {
  const [stamped, setStamped] = useState<QuickAction['tag']>()
  return (
    <PickActions
      title={title}
      stamped={stamped}
      onAct={setStamped}
      onUndo={() => setStamped(undefined)}
    />
  )
}

/** Want, Seen, Nope. Press one: it becomes Undo; Undo brings the strip back. */
export const Default: Story = { render: (args) => <Live title={args.title} /> }

/** A change is saving: presses are ignored, and the pressed button keeps focus. */
export const Saving: Story = { args: { busy: true } }

/** After "Want to see": the Undo button (the box above it shows the stamp). */
export const Stamped: Story = { args: { stamped: 'watchlist' } }
