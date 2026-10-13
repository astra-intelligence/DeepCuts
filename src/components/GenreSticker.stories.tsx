// Stories for GenreSticker, the VHS rental-store genre sticker (design approved 2026-10-07).
import type { Meta, StoryObj } from '@storybook/react-vite'
import { genreTone, GENRES } from '../domain/genres'
import { GenreSticker } from './GenreSticker'

const meta = {
  title: 'Components/GenreSticker',
  component: GenreSticker,
  args: { genreIds: [27], seed: 1091 },
  // The sticker takes its color from `--tone`, which a poster sets; this frame stands in for one.
  decorators: [
    (Story, { args }) => (
      <div
        style={genreTone(args.genreIds)}
        className="relative aspect-2/3 w-40 border border-b-3 border-poster-border border-b-(--tone) bg-poster-placeholder"
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GenreSticker>
export default meta
type Story = StoryObj<typeof meta>

/** On a grid tile (48px). */
export const OnPoster: Story = { args: { className: 'absolute top-1.5 right-1.5' } }
/** On the featured card (72px). */
export const Large: Story = { args: { size: 'lg', className: 'absolute top-3.5 right-3.5' } }

/** Every genre, each with its own tilt and wear. */
export const AllGenres: Story = {
  decorators: [(Story) => <Story />],
  render: () => (
    <ul className="grid grid-cols-4 gap-6 sm:grid-cols-7">
      {Object.entries(GENRES).map(([id, g], i) => (
        <li key={id} style={genreTone([Number(id)])} className="flex flex-col items-center gap-2">
          <GenreSticker genreIds={[Number(id)]} seed={1000 + i * 37} />
          <span className="text-xs text-fg-muted">{g.name}</span>
        </li>
      ))}
    </ul>
  ),
}
