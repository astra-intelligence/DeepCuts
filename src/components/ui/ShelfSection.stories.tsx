// Stories for ShelfSection, one of Home's full-width shelves (ADR-0040 §6b), with the three kinds
// of header meta Home uses.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptySlot } from '@/routes/discover/EmptySlot'
import { SHELF_GRID, ShelfSection } from './ShelfSection'

const meta = {
  title: 'Components/UI/ShelfSection',
  component: ShelfSection,
  args: {
    id: 'top-ten',
    feature: 1,
    title: 'Top Ten',
    children: (
      <ol className={SHELF_GRID}>
        <li>
          <EmptySlot mark="#1" title="Add a film" note="Slot still open" />
        </li>
      </ol>
    ),
  },
} satisfies Meta<typeof ShelfSection>
export default meta
type Story = StoryObj<typeof meta>

/** A count on the right: Top Ten. */
export const WithCount: Story = {
  args: { meta: <p className="font-label text-sm text-fg-muted">0 of 10 ranked</p> },
}
/** A line of copy on the right: Discovery. */
export const WithCopy: Story = {
  args: {
    id: 'discovery',
    feature: 3,
    title: 'Discovery',
    meta: <p className="font-label text-sm text-fg-muted">Deep cuts, picked for your taste</p>,
  },
}
/** No meta: the dashed rule runs to the edge. */
export const NoMeta: Story = {}
