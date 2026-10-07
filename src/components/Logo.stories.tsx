// Stories for the Deep Cuts logo, at header size and large.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo } from './Logo'

const meta = { title: 'Brand/Logo', component: Logo } satisfies Meta<typeof Logo>
export default meta
type Story = StoryObj<typeof meta>

/** As it appears in the header (28px tall). */
export const Header: Story = { args: { className: 'h-7 w-auto' } }

/** Large, to check the artwork's detail. */
export const Large: Story = { args: { className: 'h-24 w-auto' } }
