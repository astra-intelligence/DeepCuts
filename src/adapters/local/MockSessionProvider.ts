// The MVP session provider (ADR-0013, ADR-0025). "Save my picks" stores a profile on this device;
// "sign in" offers only a clearly labelled demo account. No password, no email, no network.
import { z } from 'zod'
import {
  accountSchema,
  displayNameSchema,
  type Account,
  type Session,
  type SessionProvider,
  type SignInMethod,
} from '../SessionProvider'
import { versionedStore } from './versionedStore'

const GUEST: Session = { kind: 'guest' }
const DEMO_ACCOUNT: Account = { id: 'demo', name: 'Alex Rivera', method: 'demo' }
const METHODS: readonly SignInMethod[] = [
  {
    id: 'demo',
    label: 'Continue with a demo account',
    description: 'Practice sign-in. No real account is created.',
  },
]

export function createMockSessionProvider(storage?: Storage): SessionProvider {
  const opts = storage ? { storage } : {}
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
      const a = account.load()
      if (a) return { kind: 'account', account: a }
      const p = profile.load()
      return p ? { kind: 'profile', displayName: p.displayName } : GUEST
    },
    async createProfile(name = '') {
      const displayName = displayNameSchema.parse(name)
      profile.save({ displayName })
      return { kind: 'profile', displayName }
    },
    signInMethods: () => METHODS,
    async signIn(method) {
      if (!METHODS.some((m) => m.id === method))
        throw new Error(`Unknown sign-in method: ${method}`)
      // The device profile's picks move into the account (AppSessionProvider), so it's retired.
      profile.remove()
      account.save(DEMO_ACCOUNT)
      return { kind: 'account', account: DEMO_ACCOUNT }
    },
    async signOut() {
      account.remove()
      profile.remove()
      return GUEST
    },
  }
}
