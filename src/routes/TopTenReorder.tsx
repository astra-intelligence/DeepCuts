// Home's Top Ten shelf in reorder mode (ADR-0041): the same ranked list, but each film is a
// ReorderTile with "move earlier" and "move later" buttons, and can be dragged onto another film.
//
// Loaded on demand the first time someone presses "Reorder", so the drag-and-drop code stays out
// of the first visit's bundle. The shelf (DiscoverPage.tsx) owns the toggle and the live region;
// this component works out each new order, saves it (optimistically, useReorderTopTen) and keeps
// keyboard focus on the button that was pressed while its film moves.
import { useLayoutEffect, useRef, useState } from 'react'
import type { MovieSummary } from '../api/tmdb'
import { ReorderTile } from '../components/ReorderTile'
import { SHELF_GRID } from '../components/ShelfSection'
import { moveInTopTen, type TopTenList } from '../domain/topTen'
import { useReorderTopTen } from '../session/topTenQueries'

/** A film on the shelf whose details have loaded, with its rank in the list. */
export interface RankedFilm {
  movie: MovieSummary
  rank: number
}

/** Which button to focus again once a move has shown on screen. */
interface Refocus {
  tmdbId: number
  button: 'earlier' | 'later'
  /** The order the move made; focus moves only once the list shows it. */
  order: TopTenList
}

/**
 * The Top Ten as reorderable tiles.
 * @param ids - The whole list, in ranked order (a film whose details haven't loaded has no tile,
 *   but still counts for the ranks).
 * @param announce - Says something through the shelf's polite live region.
 */
export function TopTenReorder({
  ids,
  films,
  announce,
}: {
  ids: TopTenList
  films: RankedFilm[]
  announce: (message: string) => void
}) {
  const reorder = useReorderTopTen()
  const list = useRef<HTMLOListElement>(null)
  const [dragged, setDragged] = useState<number>()
  // A ref, not state: it only waits for the list to change, and never needs a render of its own.
  const refocus = useRef<Refocus>(undefined)

  /** Moves a film to `toRank`, saves the new order and says where it landed. */
  function move(tmdbId: number, toRank: number, button?: Refocus['button']) {
    const order = moveInTopTen(ids, tmdbId, toRank - 1)
    if (order === ids) return
    reorder.mutate(order)
    const title = films.find((f) => f.movie.id === tmdbId)?.movie.title ?? 'The film'
    announce(`${title} moved to #${order.indexOf(tmdbId) + 1}.`)
    if (button) refocus.current = { tmdbId, button, order }
  }

  // React moves a tile's element to its new place, and a moved element loses keyboard focus. So
  // once the list shows the new order, focus the same button on the moved film, or its other
  // button when that one is gone (a film moved to #1 has no "earlier" button).
  useLayoutEffect(() => {
    const pending = refocus.current
    if (!pending || pending.order.join() !== ids.join()) return
    const tile = list.current?.querySelector(`[data-film="${pending.tmdbId}"]`)
    const button =
      tile?.querySelector<HTMLElement>(`[data-move="${pending.button}"]`) ??
      tile?.querySelector<HTMLElement>('[data-move]')
    button?.focus()
    refocus.current = undefined
  }, [ids])

  return (
    <ol ref={list} className={SHELF_GRID}>
      {films.map(({ movie, rank }) => (
        <li key={movie.id} data-film={movie.id} className="flex">
          <ReorderTile
            movie={movie}
            rank={rank}
            total={ids.length}
            onMove={(toRank) => move(movie.id, toRank, toRank < rank ? 'earlier' : 'later')}
            onDropFilm={(tmdbId) => move(tmdbId, rank)}
            onDragChange={(dragging) => setDragged(dragging ? movie.id : undefined)}
            isDragged={dragged === movie.id}
          />
        </li>
      ))}
    </ol>
  )
}
