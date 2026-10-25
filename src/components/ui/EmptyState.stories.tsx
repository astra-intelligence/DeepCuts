// Stories for EmptyState, the boxed message shown when there's nothing to list yet.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from './EmptyState'

const meta = {
  title: 'Components/UI/EmptyState',
  component: EmptyState,
  args: {
    children:
      'Films you tag “Want to see” will appear here. Use the search above, or open any film and tap Want to see.',
  },
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
