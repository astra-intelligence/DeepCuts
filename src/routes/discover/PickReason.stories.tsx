// Stories for PickReason: the reason line under a Discovery pick, at a phone-width tile (136px),
// with and without a fuller sentence behind it, and open.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { PickReason } from './PickReason'

const meta = {
  title: 'Pages/Discover/PickReason',
  component: PickReason,
  args: {
    title: 'Alien',
    why: { liked: 'The Thing', reason: 'Same director and writer as The Thing' },
  },
  // A phone-width tile: the line wraps most here.
  decorators: [
    (Story) => (
      <div className="w-34">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PickReason>
export default meta
type Story = StoryObj<typeof meta>

/** "Because you liked The Thing", a button that opens the full sentence. */
export const Default: Story = {}

/** Nothing more to say than the liked film: plain text, no button. */
export const Plain: Story = {
  args: { why: { liked: 'The Thing', reason: 'Because you liked The Thing' } },
}

/** No liked film suggested it (an explore pick): the sentence itself, as plain text. */
export const NoLikedFilm: Story = {
  args: { why: { reason: 'Something new for you: Western' } },
}

/** Pressed: the bubble with the full sentence. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'))
    // The popover renders outside the story's root, at the end of the page.
    const dialog = await within(document.body).findByRole('dialog')
    await expect(dialog).toHaveTextContent('Same director and writer as The Thing')
  },
}
