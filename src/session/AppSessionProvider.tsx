import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { createMockSessionProvider } from '../adapters/local/MockSessionProvider'
import { createLocalTagRepository } from '../adapters/local/LocalTagRepository'
import { createInMemoryTagRepository } from '../adapters/memory/InMemoryTagRepository'
import type { Session, SessionProvider } from '../adapters/SessionProvider'
import type { TagRepository } from '../adapters/TagRepository'
import { SessionContext, type SessionValue } from './SessionContext'

interface Props {
  children: ReactNode
  /** Resolved before the first render (see main.tsx), so the tree never renders without a session. */
  initialSession?: Session
  provider?: SessionProvider
  /** Opens a device-backed tag store; `key` separates the device profile from each account. */
  createLocalTags?: (key?: string) => TagRepository
}

const accountKey = (id: string) => `account-${id}-tags`
const openLocal = (key?: string) => createLocalTagRepository(undefined, undefined, key)

export function AppSessionProvider({
  children,
  initialSession = { kind: 'guest' },
  provider: injected,
  createLocalTags = openLocal,
}: Props) {
  const queryClient = useQueryClient()
  const [provider] = useState(() => injected ?? createMockSessionProvider())
  const [guestTags, setGuestTags] = useState(() => createInMemoryTagRepository())
  const [session, setSession] = useState(initialSession)

  const value = useMemo<SessionValue>(() => {
    const storeKey = (s: Session) =>
      s.kind === 'account' ? accountKey(s.account.id) : s.kind === 'profile' ? 'tags' : null
    const tagsFor = (s: Session) => {
      const key = storeKey(s)
      return key === null ? guestTags : key === 'tags' ? createLocalTags() : createLocalTags(key)
    }
    const tags = tagsFor(session)

    // Picks follow the person: copy them into the next store, then clear the old one
    // (ADR-0011, ADR-0016, ADR-0025).
    async function moveTo(next: Session) {
      const records = await tags.exportAll()
      // Same store (e.g. saving twice): nothing to move, and clearing would delete the picks.
      if (storeKey(next) !== null && storeKey(next) === storeKey(session)) {
        setSession(next)
        return 0
      }
      await tagsFor(next).importAll(records)
      await tags.clear()
      setGuestTags(createInMemoryTagRepository())
      setSession(next)
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
      return new Set(records.map((r) => r.tmdbId)).size
    }

    return {
      session,
      tags,
      signInMethods: provider.signInMethods(),
      async createProfile(displayName) {
        await moveTo(await provider.createProfile(displayName))
      },
      async signIn(method) {
        return { moved: await moveTo(await provider.signIn(method)) }
      },
      async signOut() {
        // The account keeps its lists; the device returns to an empty guest session.
        setGuestTags(createInMemoryTagRepository())
        setSession(await provider.signOut())
        await queryClient.invalidateQueries({ queryKey: ['tags'] })
      },
    }
  }, [session, guestTags, provider, createLocalTags, queryClient])

  return <SessionContext value={value}>{children}</SessionContext>
}
