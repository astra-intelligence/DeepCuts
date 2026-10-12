// Stories for TopTenSticker, the "Add to your Top 10" button on Detail (ADR-0036).
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TopTenSticker } from './TopTenSticker'

const meta = {
  title: 'Components/TopTenSticker',
  component: TopTenSticker,
  args: { onPress: () => {}, seed: 1091 },
  // Some room around it, so the tilt and drop shadow aren't cut off.
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TopTenSticker>
export default meta
type Story = StoryObj<typeof meta>

/** Ready to press. */
export const Default: Story = {}

/** While the add is being saved: faded, and presses are ignored. */
export const Pending: Story = { args: { pending: true } }

/** Different films wear their sticker's edges differently. */
export const Seeds: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-6">
      {[11, 603, 1091, 4232].map((seed) => (
        <TopTenSticker key={seed} {...args} seed={seed} />
      ))}
    </div>
  ),
}
