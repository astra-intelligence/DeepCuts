// Stories for the Deep Cuts logo, at header size and large, in each costume. Each story pins its
// date so it shows the same artwork whatever day Storybook runs.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo } from './Logo'

const meta = { title: 'Brand/Logo', component: Logo } satisfies Meta<typeof Logo>
export default meta
type Story = StoryObj<typeof meta>

const STANDARD = new Date(2026, 6, 4)
const HALLOWEEN = new Date(2026, 9, 13)

/** As it appears in the header (36px tall). */
export const Header: Story = { args: { className: 'h-9 w-auto', date: STANDARD } }

/** Large, to check the artwork's detail. */
export const Large: Story = { args: { className: 'h-24 w-auto', date: STANDARD } }

/** October's costume at header size. Hover it to light the jack-o'-lanterns. */
export const HalloweenHeader: Story = { args: { className: 'h-9 w-auto', date: HALLOWEEN } }

/** October's costume, large. Hover it to light the jack-o'-lanterns. */
export const HalloweenLarge: Story = { args: { className: 'h-48 w-auto', date: HALLOWEEN } }
