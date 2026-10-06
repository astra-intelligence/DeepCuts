// Who is using the app (ADR-0013). The MVP has guests and local profiles; real auth comes post-MVP.
import { z } from 'zod'

export const displayNameSchema = z.string().trim().min(1).max(40)

export type Session = { kind: 'guest' } | { kind: 'profile'; displayName: string }

export interface SessionProvider {
  getSession(): Promise<Session>
  /** Throws a ZodError for an empty or over-long name. */
  createProfile(displayName: string): Promise<Session>
  signOut(): Promise<Session>
}
