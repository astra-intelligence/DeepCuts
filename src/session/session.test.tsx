import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalTagRepository } from '../adapters/local/LocalTagRepository'
import { createMockSessionProvider } from '../adapters/local/MockSessionProvider'

const accountTags = () => createLocalTagRepository(undefined, undefined, 'account-demo-tags')
import { AppSessionProvider } from './AppSessionProvider'
import { useSession } from './SessionContext'
import { useSetTag, useTagQueries } from './tagQueries'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AppSessionProvider>{children}</AppSessionProvider>
    </QueryClientProvider>
  )
}

function useHarness() {
  const session = useSession()
  const setTag = useSetTag()
  const queries = useTagQueries()
  const liked = useQuery(queries.list('liked'))
  const movie5 = useQuery(queries.forMovie(5))
  const excluded = useQuery(queries.feedExclusions())
  return { ...session, setTag, liked: liked.data, movie5: movie5.data, excluded: excluded.data }
}

const renderHarness = () => renderHook(useHarness, { wrapper })

// Reset through the adapters: direct storage access is lint-banned outside src/adapters/local/.
beforeEach(async () => {
  await createMockSessionProvider().signOut()
  await createLocalTagRepository().clear()
  await accountTags().clear()
})
afterEach(() => vi.restoreAllMocks())

describe('session', () => {
  it('guest mode never writes to browser storage (ADR-0011)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHarness()
    expect(result.current.session).toEqual({ kind: 'guest' })
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 5, tag: 'liked', on: true }))
    await waitFor(() => expect(result.current.liked).toEqual([5]))
    expect(setItem).not.toHaveBeenCalled()
  })

  it('Create profile carries guest picks into local storage', async () => {
    const { result } = renderHarness()
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 5, tag: 'liked', on: true }))
    await act(() => result.current.createProfile('Mike'))
    expect(result.current.session).toEqual({ kind: 'profile', displayName: 'Mike' })
    expect(await createLocalTagRepository().list('liked')).toEqual([5])
    await waitFor(() => expect(result.current.liked).toEqual([5]))
  })

  it('a dislike updates the movie tags and the feed exclusions (ADR-0017)', async () => {
    const { result } = renderHarness()
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 5, tag: 'disliked', on: true }))
    await waitFor(() => expect(result.current.excluded).toEqual(new Set([5])))
    expect(result.current.movie5).toEqual(new Set(['disliked']))
  })

  it('sign out returns to an empty guest session', async () => {
    const { result } = renderHarness()
    await act(() => result.current.createProfile('Mike'))
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 9, tag: 'liked', on: true }))
    await act(() => result.current.signOut())
    expect(result.current.session).toEqual({ kind: 'guest' })
    await waitFor(() => expect(result.current.liked).toEqual([]))
  })

  it('signing in moves guest picks into the account and reports how many (ADR-0025)', async () => {
    const { result } = renderHarness()
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 5, tag: 'liked', on: true }))
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 6, tag: 'seen', on: true }))
    let moved = -1
    await act(async () => {
      moved = (await result.current.signIn('demo')).moved
    })
    expect(moved).toBe(2)
    expect(result.current.session).toMatchObject({
      kind: 'account',
      account: { name: 'Alex Rivera' },
    })
    expect(await accountTags().list('liked')).toEqual([5])
    await waitFor(() => expect(result.current.liked).toEqual([5]))
  })

  it('signing in from a device profile moves its picks and retires the profile store', async () => {
    const { result } = renderHarness()
    await act(() => result.current.createProfile())
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 7, tag: 'liked', on: true }))
    await act(() => result.current.signIn('demo'))
    expect(await createLocalTagRepository().exportAll()).toEqual([])
    expect(await accountTags().list('liked')).toEqual([7])
  })

  it('the account keeps its lists through sign out and back in', async () => {
    const { result } = renderHarness()
    await act(() => result.current.signIn('demo'))
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 8, tag: 'liked', on: true }))
    await act(() => result.current.signOut())
    await waitFor(() => expect(result.current.liked).toEqual([]))
    await act(() => result.current.signIn('demo'))
    await waitFor(() => expect(result.current.liked).toEqual([8]))
  })

  it('saving twice keeps the picks (regression: a same-store move must not clear them)', async () => {
    const { result } = renderHarness()
    await act(() => result.current.createProfile())
    await act(() => result.current.setTag.mutateAsync({ tmdbId: 9, tag: 'liked', on: true }))
    await act(() => result.current.createProfile())
    await waitFor(() => expect(result.current.liked).toEqual([9]))
  })

  it('useSession outside the provider fails loudly', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(useSession)).toThrow(/AppSessionProvider/)
  })
})
