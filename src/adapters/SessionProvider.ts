// Who is using the app (ADR-0013, ADR-0025): a guest, a profile saved on this device, or a
// signed-in account. Real sign-in methods plug in later through the same interface.
import { z } from 'zod'

// The name is optional: "Save my picks" creates a profile without asking for one (ADR-0022).
export const displayNameSchema = z.string().trim().max(40)

export const accountSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
  name: z.string().trim().min(1).max(80),
  method: z.enum(['demo']),
})
export type Account = z.infer<typeof accountSchema>
export type SignInMethodId = Account['method']

/** What the sign-in page shows for each method the provider supports. */
export interface SignInMethod {
  id: SignInMethodId
  label: string
  description: string
}

export type Session =
  | { kind: 'guest' }
  | { kind: 'profile'; displayName: string }
  | { kind: 'account'; account: Account }

export interface SessionProvider {
  getSession(): Promise<Session>
  /** Throws a ZodError for an over-long name. */
  createProfile(displayName?: string): Promise<Session>
  /** The sign-in options to offer, in display order. */
  signInMethods(): readonly SignInMethod[]
  /** Rejects for a method this provider doesn't offer, or when sign-in doesn't complete. */
  signIn(method: SignInMethodId): Promise<Session>
  /** Back to guest mode on this device. A signed-in account keeps its lists. */
  signOut(): Promise<Session>
}

/** The first word of a name, for the header ("Alex Rivera" → "Alex"). */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''
