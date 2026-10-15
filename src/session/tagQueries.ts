// Tag reads and writes through TanStack Query (ADR-0015).
//
// TanStack Query caches each read under a "query key" and re-fetches when that key is
// invalidated. Keys include a scope (signed out, or which account), so switching accounts never
// shows the other store's cached tags.
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session } from '../adapters/SessionProvider'
import type { TagRepository } from '../adapters/TagRepository'
import type { SystemTag } from '../domain/tagRules'
import { useSession } from './SessionContext'
import { useOrderMutation } from './useOrderMutation'

/**
 * The tag queries for one store, ready to pass to `useQuery`.
 * Every key starts with `['tags', scope]`, so a single invalidation refreshes them all.
 */
export function tagQueries(repo: TagRepository, scope: string) {
  return {
    /** The tags on one film (Detail page, Search rows). */
    forMovie: (tmdbId: number) =>
      queryOptions({
        queryKey: ['tags', scope, 'movie', tmdbId],
        queryFn: () => repo.getTags(tmdbId),
      }),
    /** The film ids on one list, newest first; the watchlist in its saved order (ADR-0041). */
    list: (tag: SystemTag) =>
      queryOptions({ queryKey: ['tags', scope, 'list', tag], queryFn: () => repo.list(tag) }),
    /** Every tag record, e.g. to count the films someone has tagged. */
    all: () => queryOptions({ queryKey: ['tags', scope, 'all'], queryFn: () => repo.exportAll() }),
    /** Film ids to keep out of feeds (disliked films). */
    feedExclusions: () =>
      queryOptions({
        queryKey: ['tags', scope, 'feedExclusions'],
        queryFn: () => repo.feedExclusions(),
      }),
  }
}

/** The cache scope for a session's tags: `signedOut`, or one per account (e.g. `passkey:abc`). */
export const tagScope = (session: Session) =>
  session.kind === 'account' ? `${session.account.method}:${session.account.id}` : session.kind

/** The tag queries for the current session's store. */
export function useTagQueries() {
  const { tags, session } = useSession()
  return tagQueries(tags, tagScope(session))
}

/**
 * Turns a tag on or off: `useSetTag().mutate({ tmdbId, tag, on })`.
 * Afterwards the film's tags update at once, and every other tag query re-fetches, because one
 * change can move a film between lists (e.g. Dislike removes Like).
 */
export function useSetTag() {
  const { tags, session } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tmdbId, tag, on }: { tmdbId: number; tag: SystemTag; on: boolean }) =>
      tags.setTag(tmdbId, tag, on),
    onSuccess: (next, { tmdbId }) => {
      // Show the new tags on this film straight away, without waiting for a re-fetch…
      queryClient.setQueryData(tagQueries(tags, tagScope(session)).forMovie(tmdbId).queryKey, next)
      // …then refresh lists, counts and exclusions. Returning the promise keeps the mutation
      // "pending" until that's done.
      return queryClient.invalidateQueries({ queryKey: ['tags', tagScope(session)] })
    },
  })
}

/**
 * Saves a new order for the watchlist (ADR-0041): `useReorderWatchlist().mutate(order)`.
 * Optimistic, with a rollback or a re-fetch on failure (useOrderMutation). Home's watchlist shelf
 * and the scorer read the same cached list, so they follow the new order at once.
 */
export function useReorderWatchlist() {
  const { tags } = useSession()
  const { queryKey } = useTagQueries().list('watchlist')
  return useOrderMutation(queryKey, (order) => tags.reorder('watchlist', order), 'Your watchlist')
}
