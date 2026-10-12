// Stories for TopTenNotice, the line Detail shows instead of the Top Ten sticker (ADR-0036).
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TopTenNotice } from './TopTenNotice'

const meta = {
  title: 'Components/TopTenNotice',
  component: TopTenNotice,
  args: { children: 'This is one of your top 10!' },
} satisfies Meta<typeof TopTenNotice>
export default meta
type Story = StoryObj<typeof meta>

/** The film is in the Top Ten, with Remove. */
export const InTopTen: Story = { args: { onRemove: () => {} } }

/** While the removal is being saved. */
export const Removing: Story = { args: { onRemove: () => {}, pending: true } }

/** The list is full and this film isn't in it: a message only. */
export const Full: Story = { args: { children: 'Your Top Ten is full.' } }
