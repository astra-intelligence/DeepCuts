// The session provider for real accounts (ADR-0031, Stage 6 A4): passkeys against the accounts API
// (`/api/auth/*`, Cloudflare Pages Functions + D1).
//
// Only passkey accounts live on the server. Everything else stays on this device and is handed to
// the local provider unchanged: guests, "Save my picks" profiles, and the demo account, which
// reviewers can try without signing up (ADR-0025).
//
// The browser side of WebAuthn comes from @simplewebauthn/browser: `startRegistration` asks the
// device to create a passkey, `startAuthentication` asks it to use one. Cancelling that prompt
// rejects (NotAllowedError), which the pages show as "didn't finish, nothing was changed".
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { z } from 'zod'
import { createMockSessionProvider } from '../local/MockSessionProvider'
import { AccountsApiError } from './AccountsApiError'
import {
  registrationSchema,
  type Registration,
  type Session,
  type SessionProvider,
  type SignInMethod,
} from '../SessionProvider'

// What the server says about the signed-in user.
const userSchema = z.object({
  id: z.string().regex(/^[\w-]{1,64}$/),
  name: z.string().min(1).max(80),
})
// The options step's answer: a challenge id and the WebAuthn options, which the browser library
// passes to the device as-is (the device and the server check them).
const optionsSchema = z.object({
  challengeId: z.string().regex(/^[\w-]{22}$/),
  options: z.looseObject({ challenge: z.string() }),
})
const errorSchema = z.object({ error: z.string().max(64) })

/** Calls the accounts API (same origin, cookies included) and validates the answer. */
async function api<T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  })
  const data: unknown = await res.json().catch(() => undefined)
  if (!res.ok)
    throw new AccountsApiError(res.status, errorSchema.safeParse(data).data?.error ?? 'error')
  const parsed = schema.safeParse(data)
  // A 200 that isn't the expected JSON (e.g. the app's HTML when Functions are skipped) is an error.
  if (!parsed.success) throw new AccountsApiError(502, 'bad_response')
  return parsed.data
}

// A passkey account as a session.
const accountSession = (user: z.infer<typeof userSchema>): Session => ({
  kind: 'account',
  account: { id: user.id, name: user.name, method: 'passkey' },
})

const GUEST: Session = { kind: 'guest' }

// Passkey first: it's the real account. The demo stays for reviewers (ADR-0025).
const PASSKEY: SignInMethod = {
  id: 'passkey',
  label: 'Sign in with a passkey',
  description: 'Use your fingerprint, face or device PIN.',
}

/**
 * Builds the Cloudflare session provider.
 * @param local - The on-device provider for guests, profiles and the demo (tests inject one).
 */
export function createCloudflareSessionProvider(
  local: SessionProvider = createMockSessionProvider(),
): SessionProvider {
  return {
    async getSession() {
      try {
        return accountSession(await api('GET', '/api/auth/session', userSchema))
      } catch {
        // Signed out (401), or the API can't be reached: whatever this device has saved.
        return local.getSession()
      }
    },
    createProfile: (displayName) => local.createProfile(displayName),
    practiceRegistration: false,
    signInMethods: () => [PASSKEY, ...local.signInMethods()],
    async signIn(method) {
      if (method !== 'passkey') return local.signIn(method)
      const { challengeId, options } = await api(
        'POST',
        '/api/auth/authenticate/options',
        optionsSchema,
      )
      const response = await startAuthentication({ optionsJSON: options as never })
      const user = await api('POST', '/api/auth/authenticate/verify', userSchema, {
        challengeId,
        response,
      })
      // The device profile's picks move into the account (AppSessionProvider), so it's retired.
      await local.signOut()
      return accountSession(user)
    },
    async register(details: Registration) {
      // parse() throws a ZodError for invalid details; the form shows them before getting here.
      const valid = registrationSchema.parse(details)
      const { challengeId, options } = await api(
        'POST',
        '/api/auth/register/options',
        optionsSchema,
        valid,
      )
      const response = await startRegistration({ optionsJSON: options as never })
      const user = await api('POST', '/api/auth/register/verify', userSchema, {
        challengeId,
        response,
      })
      await local.signOut()
      return accountSession(user)
    },
    async signOut() {
      // End the server session if there is one (harmless otherwise), and anything on the device.
      await api('POST', '/api/auth/sign-out', z.unknown()).catch(() => undefined)
      await local.signOut()
      return GUEST
    },
    async rename(name) {
      return accountSession(await api('PATCH', '/api/auth/me', userSchema, { name }))
    },
    async deleteAccount() {
      await api('DELETE', '/api/auth/me', z.unknown())
      await local.signOut()
      return GUEST
    },
  }
}
