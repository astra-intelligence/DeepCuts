// Session context (ADR-0016): the current session and the tag repository that matches it.
import { createContext, useContext } from 'react'
import type { Session, SignInMethod, SignInMethodId } from '../adapters/SessionProvider'
import type { TagRepository } from '../adapters/TagRepository'

export interface SessionValue {
  session: Session
  /** Guest: in memory. Device profile or account: localStorage. Callers never need to know which. */
  tags: TagRepository
  signInMethods: readonly SignInMethod[]
  createProfile(displayName?: string): Promise<void>
  /** Moves the current picks into the account. Resolves with how many films moved. */
  signIn(method: SignInMethodId): Promise<{ moved: number }>
  signOut(): Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <AppSessionProvider>')
  return value
}
