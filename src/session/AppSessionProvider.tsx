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
  createLocalTags?: () => TagRepository
}

export function AppSessionProvider({
  children,
  initialSession = { kind: 'guest' },
  provider: injected,
  createLocalTags = createLocalTagRepository,
}: Props) {
  const queryClient = useQueryClient()
  const [provider] = useState(() => injected ?? createMockSessionProvider())
  const [guestTags, setGuestTags] = useState(() => createInMemoryTagRepository())
  const [session, setSession] = useState(initialSession)

  const value = useMemo<SessionValue>(() => {
    const tags = session.kind === 'profile' ? createLocalTags() : guestTags
    return {
      session,
      tags,
      async createProfile(displayName) {
        const next = await provider.createProfile(displayName)
        // Guest picks move into the profile, then leave memory (ADR-0011, ADR-0016).
        await createLocalTags().importAll(await guestTags.exportAll())
        setGuestTags(createInMemoryTagRepository())
        setSession(next)
        await queryClient.invalidateQueries({ queryKey: ['tags'] })
      },
      async signOut() {
        setSession(await provider.signOut())
        await queryClient.invalidateQueries({ queryKey: ['tags'] })
      },
    }
  }, [session, guestTags, provider, createLocalTags, queryClient])

  return <SessionContext value={value}>{children}</SessionContext>
}
