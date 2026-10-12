// Stories for FeaturePanel, the shared frame of the landing page and Home (ADR-0035): each of the
// three panels as the landing page shows it, and the row of three as it sits from `lg`.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FeaturePanel } from './FeaturePanel'
import { PanelArt } from './PanelArt'
import { PANELS, type PanelId } from './panels'

// The landing page's explainer for one panel: illustration, then a line of copy.
function Explainer({ id, copy }: { id: PanelId; copy: string }) {
  return (
    <FeaturePanel panel={PANELS[id]}>
      <div className="grid place-items-center rounded-container bg-surface-raised px-4 py-5">
        <PanelArt id={id} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">{copy}</p>
    </FeaturePanel>
  )
}

const meta = {
  title: 'Components/FeaturePanel',
  component: FeaturePanel,
  args: {
    panel: PANELS.watchlist,
    action: { to: '/lists?tag=watchlist', label: 'See all' },
    children: (
      <p className="text-sm leading-relaxed text-fg-muted">
        Save a film from search or its details, and it will be waiting here.
      </p>
    ),
  },
} satisfies Meta<typeof FeaturePanel>
export default meta
type Story = StoryObj<typeof meta>

/** A Home panel with its header link and an empty state. */
export const WithAction: Story = {}

/** Top Ten on the landing page: the ranked-list illustration, number one in gold. */
export const TopTen: Story = {
  render: () => <Explainer id="top-ten" copy="Rank the ten films you’d defend to anyone." />,
}

/** Movies I want to watch on the landing page: a fan of cassettes, the front one bookmarked. */
export const Watchlist: Story = {
  render: () => <Explainer id="watchlist" copy="Save a film the moment you hear about it." />,
}

/** Discovery on the landing page: a row of picks, the middle one badged with its match. */
export const Discovery: Story = {
  render: () => (
    <Explainer id="discovery" copy="Like a few films and get deep cuts picked for you." />
  ),
}

/** All three in one row, as from `lg`: the panels stretch to the same height. */
export const Row: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <ul className="grid gap-4 p-4 lg:grid-cols-3">
      <li>
        <Explainer id="top-ten" copy="Rank the ten films you’d defend to anyone." />
      </li>
      <li>
        <Explainer id="watchlist" copy="Save a film the moment you hear about it." />
      </li>
      <li>
        <Explainer id="discovery" copy="Like a few films and get deep cuts picked for you." />
      </li>
    </ul>
  ),
}
