// Stories for Icon: every icon in the set, at the default size, in the text color.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Icon, type IconName } from './Icon'

const NAMES: IconName[] = [
  'home',
  'search',
  'list',
  'back',
  'arrow',
  'eye',
  'bookmark',
  'heart',
  'ban',
  'check',
  'user',
  'x',
]

const meta = { title: 'Components/Icon', component: Icon, args: { name: 'search' } } satisfies Meta<
  typeof Icon
>
export default meta
type Story = StoryObj<typeof meta>

/** One icon; pick it in the controls. Icons are decorative: the text next to them names things. */
export const Single: Story = {}

/** The whole set, labelled. */
export const All: Story = {
  render: () => (
    <ul className="grid grid-cols-4 gap-4 text-sm text-fg-muted sm:grid-cols-6">
      {NAMES.map((name) => (
        <li key={name} className="flex flex-col items-center gap-1.5">
          <Icon name={name} className="size-6 text-fg" />
          {name}
        </li>
      ))}
    </ul>
  ),
}
