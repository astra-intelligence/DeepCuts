// Stories for PageHeading, the block at the top of every main page.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageHeading } from './PageHeading'

const meta = {
  title: 'Components/PageHeading',
  component: PageHeading,
  args: {
    eyebrow: 'Your corner',
    title: 'My Lists',
    lede: 'Everything you’ve tagged, in one place.',
  },
} satisfies Meta<typeof PageHeading>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** An empty lede renders nothing. */
export const WithoutLede: Story = { args: { lede: '' } }
/** A long title wraps and balances instead of overflowing. */
export const LongTitle: Story = {
  args: {
    eyebrow: 'Search results',
    title: 'Results for “Dr. Strangelove or: How I Learned to Stop Worrying”',
  },
}
