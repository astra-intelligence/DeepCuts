// Session context (ADR-0016): the current session and the tag repository that matches it.
import { createContext, useContext } from 'react'
import type { Session } from '../adapters/SessionProvider'
import type { TagRepository } from '../adapters/TagRepository'

export interface SessionValue {
  session: Session
  /** In-memory for guests, localStorage for profiles. Callers never need to know which. */
  tags: TagRepository
  createProfile(displayName: string): Promise<void>
  signOut(): Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <AppSessionProvider>')
  return value
}
