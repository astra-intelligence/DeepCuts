// Stories for PickReason: the "Why this pick?" button under a Discovery pick, at a phone-width
// tile (136px), closed and open, with a short and a long reason.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { PickReason } from './PickReason'

const meta = {
  title: 'Pages/Discover/PickReason',
  component: PickReason,
  args: { title: 'Alien', reason: 'Same director and writer as The Thing' },
  // A phone-width tile: the bubble has the least room here.
  decorators: [
    (Story) => (
      <div className="flex w-34 flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PickReason>
export default meta
type Story = StoryObj<typeof meta>

// Presses the button and waits for the bubble, which renders at the end of the page.
async function open(canvasElement: HTMLElement, text: string) {
  await userEvent.click(within(canvasElement).getByRole('button'))
  const dialog = await within(document.body).findByRole('dialog')
  await expect(dialog).toHaveTextContent(text)
}

/** Closed: "Why this pick?" */
export const Default: Story = {}

/** Pressed: the bubble with the full sentence. */
export const Open: Story = {
  play: ({ canvasElement }) => open(canvasElement, 'Same director and writer as The Thing'),
}

/** The longest kind of reason, open: a fallback with traits. */
export const LongReason: Story = {
  args: { reason: "Because you liked The Texas Chain Saw Massacre: a lesser-known '70s film" },
  play: ({ canvasElement }) => open(canvasElement, 'a lesser-known'),
}
