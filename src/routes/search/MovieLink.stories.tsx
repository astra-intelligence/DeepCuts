// Stories for MovieLink, one film as a list row (Search, My Lists).
import type { Meta, StoryObj } from '@storybook/react-vite'
import { searchResultsSchema } from '@/api/tmdb'
import { genreTone } from '@/domain/genres'
import { searchFixture } from '@/test/msw/fixtures'
import { MovieLink } from './MovieLink'

// The same hand-written film the tests use, validated like real API data.
const [film] = searchResultsSchema.parse(searchFixture).results
if (!film) throw new Error('The search fixture needs at least one film')

const meta = {
  title: 'Pages/Search/MovieLink',
  component: MovieLink,
  args: { movie: film, meta: ['1982', 'Horror'] },
  decorators: [
    (Story) => (
      <div style={genreTone(film.genre_ids)} className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MovieLink>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** Disliked films stay findable in Search, with a marker (design decision E4). */
export const Disliked: Story = { args: { disliked: true } }
/** No poster: a same-size placeholder keeps rows aligned. */
export const NoPoster: Story = { args: { movie: { ...film, poster_path: null } } }
