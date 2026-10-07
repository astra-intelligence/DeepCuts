// The session contract (ADR-0013, ADR-0025): who is using the app.
//
// There are three kinds of session:
// - guest: picks live only in memory and vanish on reload (ADR-0011, an honest guest mode);
// - profile: "Save my picks" keeps them in this browser (ADR-0022);
// - account: signed in. Today the only method is a practice "demo" account; real methods
//   (Google, GitHub, passkeys…) plug in later through this same interface.
import { z } from 'zod'

// The name is optional: "Save my picks" creates a profile without asking for one (ADR-0022).
// Trimmed and capped so stored data stays small and safe to show.
export const displayNameSchema = z.string().trim().max(40)

/** A signed-in account as stored and shown. `id` is restricted so it's safe in storage keys. */
export const accountSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
  name: z.string().trim().min(1).max(80),
  method: z.enum(['demo']),
})
/** A signed-in account (see `accountSchema`). */
export type Account = z.infer<typeof accountSchema>
/** Which way someone signed in. Only `'demo'` exists until real methods are chosen. */
export type SignInMethodId = Account['method']

/** What the sign-in page shows for each method the provider supports. */
export interface SignInMethod {
  id: SignInMethodId
  label: string
  description: string
}

/** The current session: a guest, a profile saved on this device, or a signed-in account. */
export type Session =
  | { kind: 'guest' }
  | { kind: 'profile'; displayName: string }
  | { kind: 'account'; account: Account }

/** Everything the app can do with sessions, independent of how sign-in actually works. */
export interface SessionProvider {
  /** The session saved from last time, or a guest session. */
  getSession(): Promise<Session>
  /** Saves picks on this device ("Save my picks"). Throws a ZodError for an over-long name. */
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
