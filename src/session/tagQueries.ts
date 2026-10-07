// Tag reads and writes through TanStack Query (ADR-0015).
//
// TanStack Query caches each read under a "query key" and re-fetches when that key is
// invalidated. Keys include the session kind, so switching between guest, profile and account
// never shows the other store's cached tags.
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TagRepository } from '../adapters/TagRepository'
import type { SystemTag } from '../domain/tagRules'
import { useSession } from './SessionContext'

/**
 * The tag queries for one store, ready to pass to `useQuery`.
 * Every key starts with `['tags', kind]`, so a single invalidation refreshes them all.
 */
export function tagQueries(repo: TagRepository, kind: string) {
  return {
    /** The tags on one film (Detail page, Search rows). */
    forMovie: (tmdbId: number) =>
      queryOptions({
        queryKey: ['tags', kind, 'movie', tmdbId],
        queryFn: () => repo.getTags(tmdbId),
      }),
    /** The film ids on one list, newest first (My Lists, the scorer). */
    list: (tag: SystemTag) =>
      queryOptions({ queryKey: ['tags', kind, 'list', tag], queryFn: () => repo.list(tag) }),
    /** Every tag record, e.g. to count the films someone has tagged. */
    all: () => queryOptions({ queryKey: ['tags', kind, 'all'], queryFn: () => repo.exportAll() }),
    /** Film ids to keep out of feeds (disliked films). */
    feedExclusions: () =>
      queryOptions({
        queryKey: ['tags', kind, 'feedExclusions'],
        queryFn: () => repo.feedExclusions(),
      }),
  }
}

/** The tag queries for the current session's store. */
export function useTagQueries() {
  const { tags, session } = useSession()
  return tagQueries(tags, session.kind)
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
      queryClient.setQueryData(tagQueries(tags, session.kind).forMovie(tmdbId).queryKey, next)
      // …then refresh lists, counts and exclusions. Returning the promise keeps the mutation
      // "pending" until that's done.
      return queryClient.invalidateQueries({ queryKey: ['tags', session.kind] })
    },
  })
}
