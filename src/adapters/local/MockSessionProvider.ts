// The MVP session provider (ADR-0013, ADR-0025), running entirely in this browser.
//
// "Save my picks" stores a profile on this device; "sign in" offers only a clearly labelled demo
// account. Registration (ADR-0031) makes a practice account: the invite code is validated and then
// dropped, never stored, and no passkey is made. No network. When real sign-in methods are chosen, a new
// provider implements the same SessionProvider interface and the screens don't change.
import { z } from 'zod'
import {
  accountSchema,
  displayNameSchema,
  registrationSchema,
  type Account,
  type Session,
  type SessionProvider,
  type SignInMethod,
} from '../SessionProvider'
import { versionedStore } from './versionedStore'

const GUEST: Session = { kind: 'guest' }
// The practice account everyone signs in as (the project owner's name), labelled as a demo in the UI.
const DEMO_ACCOUNT: Account = { id: 'demo', name: 'Mike Curts', method: 'demo' }
// The sign-in options shown on the sign-in page, in order.
const METHODS: readonly SignInMethod[] = [
  {
    id: 'demo',
    label: 'Continue with a demo account',
    description: 'Practice sign-in. No real account is created.',
  },
]

/**
 * Builds the local session provider.
 * @param storage - Defaults to the browser's localStorage; tests pass their own.
 */
export function createMockSessionProvider(storage?: Storage): SessionProvider {
  const opts = storage ? { storage } : {}
  // Two stored values: the device profile ("Save my picks") and the signed-in account.
  const profile = versionedStore<{ displayName: string } | null>({
    key: 'profile',
    schema: z.object({ displayName: displayNameSchema }).nullable(),
    fallback: null,
    ...opts,
  })
  const account = versionedStore<Account | null>({
    key: 'account',
    schema: accountSchema.nullable(),
    fallback: null,
    ...opts,
  })
  return {
    async getSession() {
      // A signed-in account wins over a device profile; with neither, it's a guest.
      const a = account.load()
      // The demo account is defined here, not by what was stored: a browser that signed in before
      // the demo was renamed (Alex Rivera → Mike Curts) would otherwise keep the old name forever.
      if (a?.method === 'demo') return { kind: 'account', account: DEMO_ACCOUNT }
      if (a) return { kind: 'account', account: a }
      const p = profile.load()
      return p ? { kind: 'profile', displayName: p.displayName } : GUEST
    },
    async createProfile(name = '') {
      // parse() throws for an over-long name, which the Account page shows as an error.
      const displayName = displayNameSchema.parse(name)
      profile.save({ displayName })
      return { kind: 'profile', displayName }
    },
    // Registration here only makes a practice account; the page says so.
    practiceRegistration: true,
    signInMethods: () => METHODS,
    async signIn(method) {
      if (!METHODS.some((m) => m.id === method))
        throw new Error(`Unknown sign-in method: ${method}`)
      // The device profile's picks move into the account (AppSessionProvider), so it's retired.
      profile.remove()
      account.save(DEMO_ACCOUNT)
      return { kind: 'account', account: DEMO_ACCOUNT }
    },
    async register(details) {
      // parse() throws a ZodError for invalid details; the form shows them before getting here.
      const { name } = registrationSchema.parse(details)
      // Only the name is kept. Any well-formed invite code is accepted: the real check (single
      // use, not expired) happens on the server in the accounts stage (ADR-0031).
      // One fixed id: registering again on this device returns to the same practice lists.
      const practice: Account = { id: 'practice', name, method: 'practice' }
      profile.remove()
      account.save(practice)
      return { kind: 'account', account: practice }
    },
    async signOut() {
      // Forget who's signed in. The account's own tag list stays stored for next time.
      account.remove()
      profile.remove()
      return GUEST
    },
  }
}
