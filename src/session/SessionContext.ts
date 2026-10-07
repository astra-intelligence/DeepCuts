// Session context (ADR-0016): makes the current session, and the tag store that belongs to it,
// available to every screen through `useSession()`.
//
// Screens never pick a store themselves: a guest gets the in-memory store, a saved profile or a
// demo/practice account gets its own localStorage store, and a passkey account gets its lists on
// the server (ADR-0031). AppSessionProvider fills this context.
import { createContext, useContext } from 'react'
import type {
  Registration,
  Session,
  SignInMethod,
  SignInMethodId,
} from '../adapters/SessionProvider'
import type { TagRepository } from '../adapters/TagRepository'

/** What `useSession()` gives a component. */
export interface SessionValue {
  session: Session
  /** Guest: in memory. Profile, demo or practice: localStorage. Passkey account: the server. */
  tags: TagRepository
  /** The sign-in options to show on the sign-in page. */
  signInMethods: readonly SignInMethod[]
  /** "Save my picks": moves the guest's picks onto this device. */
  createProfile(displayName?: string): Promise<void>
  /** Moves the current picks into the account. Resolves with how many films moved. */
  signIn(method: SignInMethodId): Promise<{ moved: number }>
  /** Creates an account from the registration form, then moves picks in like sign-in does. */
  register(details: Registration): Promise<{ moved: number }>
  /** Back to an empty guest session; the account keeps its lists. */
  signOut(): Promise<void>
  /** True when registration only makes a practice account on this device (the local mock). */
  practiceRegistration: boolean
  /** Renames the signed-in passkey account. Undefined where accounts can't be renamed. */
  rename: ((name: string) => Promise<void>) | undefined
  /** Deletes the signed-in passkey account and its lists. Undefined where unsupported. */
  deleteAccount: (() => Promise<void>) | undefined
}

/** The React context itself. Use `useSession()` rather than reading this directly. */
export const SessionContext = createContext<SessionValue | null>(null)

/** The current session and its tag store. Must be used inside <AppSessionProvider>. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <AppSessionProvider>')
  return value
}
