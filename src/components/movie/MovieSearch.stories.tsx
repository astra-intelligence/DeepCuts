// Stories for MovieSearch, the search field in every page's header. Suggestions need the TMDB
// proxy, so in Storybook the field shows its resting state.
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MovieSearch } from './MovieSearch'

const meta = {
  title: 'Components/Movie/MovieSearch',
  component: MovieSearch,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MovieSearch>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
