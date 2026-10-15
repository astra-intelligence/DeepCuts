// Top Ten reads and writes through TanStack Query (ADR-0015, ADR-0036).
//
// Same shape as tagQueries.ts: the cached list's key includes the session scope (signed out, or
// which account), so switching accounts never shows someone else's Top Ten. After a change the
// store's answer *is* the new list, so it goes straight into the cache with no re-fetch.
// Reordering (ADR-0041) updates the cache first, so a film moves the moment it's pressed.
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TopTenChangedError, TopTenFullError, type TopTenList } from '../domain/topTen'
import { notify } from '../notify'
import { useSession } from './SessionContext'
import { tagScope } from './tagQueries'

/** The query options for the current session's Top Ten, ready for `useQuery`. */
function useTopTenQuery() {
  const { topTen, session } = useSession()
  return queryOptions({
    queryKey: ['topTen', tagScope(session)],
    queryFn: () => topTen.list(),
  })
}

/** The current session's Top Ten, in ranked order: `useTopTen().data` is `[id, …]` once loaded. */
export function useTopTen() {
  return useQuery(useTopTenQuery())
}

/**
 * Adds a film to, or removes it from, the Top Ten: `useChangeTopTen().mutate({ tmdbId, on })`.
 * Afterwards the cached list is the store's answer. A full list rejects with `TopTenFullError`;
 * the list is then re-fetched, because it must have filled up elsewhere (another tab or device).
 */
export function useChangeTopTen() {
  const { topTen } = useSession()
  const queryClient = useQueryClient()
  const { queryKey } = useTopTenQuery()
  return useMutation({
    mutationFn: ({ tmdbId, on }: { tmdbId: number; on: boolean }) =>
      on ? topTen.add(tmdbId) : topTen.remove(tmdbId),
    onSuccess: (list) => queryClient.setQueryData(queryKey, list),
    onError: (error) => {
      if (error instanceof TopTenFullError) return queryClient.invalidateQueries({ queryKey })
    },
  })
}

/** Runs every reorder for a session one after another, so an older order can't land last. */
const REORDER_SCOPE = 'top-ten-reorder'

/**
 * Saves a new order for the Top Ten (ADR-0041): `useReorderTopTen().mutate(order)`.
 *
 * Optimistic: the cached list becomes `order` at once, and is put back if the save fails, with a
 * toast saying so. If the list changed elsewhere (`TopTenChangedError`), it's re-fetched instead,
 * so the shelf shows what's really stored. Quick presses queue up (the mutation scope), and only
 * the last answer is written to the cache, so the films don't jump back while saves catch up.
 */
export function useReorderTopTen() {
  const { topTen } = useSession()
  const queryClient = useQueryClient()
  const { queryKey } = useTopTenQuery()
  const mutationKey = [REORDER_SCOPE, ...queryKey]
  return useMutation({
    mutationKey,
    scope: { id: REORDER_SCOPE },
    mutationFn: (order: TopTenList) => topTen.reorder(order),
    onMutate: async (order) => {
      // Stop a re-fetch in flight from overwriting the new order with the old one.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TopTenList>(queryKey)
      queryClient.setQueryData(queryKey, order)
      return { previous }
    },
    onSuccess: (list) => {
      // Later presses are still saving: their order is already in the cache, so leave it.
      if (queryClient.isMutating({ mutationKey }) > 1) return
      queryClient.setQueryData(queryKey, list)
    },
    onError: (error, _order, context) => {
      if (error instanceof TopTenChangedError) {
        notify.error('Your Top Ten changed somewhere else. Here’s the latest order.')
        return queryClient.invalidateQueries({ queryKey })
      }
      queryClient.setQueryData(queryKey, context?.previous)
      notify.error('Your new order wasn’t saved. Try again.')
    },
  })
}
