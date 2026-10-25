// Stories for the Deep Cuts logo, at header size and large, in each costume, with and without the
// tagline. Each story pins its
// date so it shows the same artwork whatever day Storybook runs.
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { Logo } from './Logo'

const meta = { title: 'Components/Layout/Logo', component: Logo } satisfies Meta<typeof Logo>
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

/**
 * Stacks the artwork and tagline the way the header's Home link does (AppLayout.tsx). A button,
 * so hovering or tabbing to it lights the Halloween costume, as the link does.
 */
const stacked: Decorator = (Story) => (
  <button type="button" className="inline-flex flex-col items-start gap-1">
    <Story />
  </button>
)

/** The main header's lockup: the wordmark with the tagline under it. */
export const WithTagline: Story = {
  args: { className: 'h-10 w-auto', date: STANDARD, tagline: true },
  decorators: [stacked],
}

/** October's lockup. Hover it: the tagline turns orange with CUTS. */
export const HalloweenWithTagline: Story = {
  args: { className: 'h-10 w-auto', date: HALLOWEEN, tagline: true },
  decorators: [stacked],
}
