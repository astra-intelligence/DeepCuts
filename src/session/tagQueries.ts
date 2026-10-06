// Tag reads and writes through TanStack Query (ADR-0015). Keys include the session kind, so switching
// between guest and profile never shows the other repository's cached tags.
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TagRepository } from '../adapters/TagRepository'
import type { SystemTag } from '../domain/tagRules'
import { useSession } from './SessionContext'

export function tagQueries(repo: TagRepository, kind: string) {
  return {
    forMovie: (tmdbId: number) =>
      queryOptions({
        queryKey: ['tags', kind, 'movie', tmdbId],
        queryFn: () => repo.getTags(tmdbId),
      }),
    list: (tag: SystemTag) =>
      queryOptions({ queryKey: ['tags', kind, 'list', tag], queryFn: () => repo.list(tag) }),
    feedExclusions: () =>
      queryOptions({
        queryKey: ['tags', kind, 'feedExclusions'],
        queryFn: () => repo.feedExclusions(),
      }),
  }
}

export function useTagQueries() {
  const { tags, session } = useSession()
  return tagQueries(tags, session.kind)
}

export function useSetTag() {
  const { tags, session } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tmdbId, tag, on }: { tmdbId: number; tag: SystemTag; on: boolean }) =>
      tags.setTag(tmdbId, tag, on),
    onSuccess: (next, { tmdbId }) => {
      queryClient.setQueryData(tagQueries(tags, session.kind).forMovie(tmdbId).queryKey, next)
      return queryClient.invalidateQueries({ queryKey: ['tags', session.kind] })
    },
  })
}
