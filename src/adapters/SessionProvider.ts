// The session contract (ADR-0013, ADR-0025): who is using the app.
//
// There are three kinds of session:
// - guest: picks live only in memory and vanish on reload (ADR-0011, an honest guest mode);
// - profile: "Save my picks" keeps them in this browser (ADR-0022);
// - account: signed in. Today there are two practice kinds, the shared "demo" account and a
//   "practice" account made with the registration form (ADR-0030). Real methods (Google,
//   GitHub, passkeys…) plug in later through this same interface.
import { z } from 'zod'

// The name is optional: "Save my picks" creates a profile without asking for one (ADR-0022).
// Trimmed and capped so stored data stays small and safe to show.
export const displayNameSchema = z.string().trim().max(40)

/** A signed-in account as stored and shown. `id` is restricted so it's safe in storage keys. */
export const accountSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
  name: z.string().trim().min(1).max(80),
  // demo: the shared practice account (ADR-0025). practice: made with the registration form
  // (ADR-0030). Neither is a real account; both live only on this device.
  method: z.enum(['demo', 'practice']),
})
/** A signed-in account (see `accountSchema`). */
export type Account = z.infer<typeof accountSchema>
/** The sign-in page's buttons. Only `'demo'` exists until real methods are chosen. */
export type SignInMethodId = Extract<Account['method'], 'demo'>

/**
 * What the registration form asks for (ADR-0030). The messages are shown under each field.
 * - name: the same limit an account name has.
 * - email: 254 characters is the longest address that can be delivered (RFC 5321).
 * - password: 15 to 128 characters with no "must include a symbol" rules, following
 *   NIST SP 800-63B-4 for a password that is the only factor. Never trimmed: spaces count.
 */
export const registrationSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .max(254, 'Use 254 characters or fewer.')
    .pipe(z.email('Enter an email address like name@example.com.')),
  password: z
    .string()
    .min(15, 'Use at least 15 characters.')
    .max(128, 'Use 128 characters or fewer.'),
})
/** The registration form's fields (see `registrationSchema`). */
export type Registration = z.infer<typeof registrationSchema>

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
  /**
   * Creates an account from the registration form and signs it in (ADR-0030). Throws a ZodError
   * for invalid details. The local mock keeps only the name; email and password are discarded.
   */
  register(details: Registration): Promise<Session>
  /** Back to guest mode on this device. A signed-in account keeps its lists. */
  signOut(): Promise<Session>
}

/** The first word of a name, for the header ("Mike Curts" → "Mike"). */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? ''
