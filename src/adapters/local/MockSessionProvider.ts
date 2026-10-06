// "Create profile" stores a display name on this device only: no password, no email (ADR-0013).
import { z } from 'zod'
import { displayNameSchema, type Session, type SessionProvider } from '../SessionProvider'
import { versionedStore } from './versionedStore'

const GUEST: Session = { kind: 'guest' }

export function createMockSessionProvider(storage?: Storage): SessionProvider {
  const store = versionedStore<{ displayName: string } | null>({
    key: 'profile',
    schema: z.object({ displayName: displayNameSchema }).nullable(),
    fallback: null,
    ...(storage && { storage }),
  })
  return {
    async getSession() {
      const profile = store.load()
      return profile ? { kind: 'profile', displayName: profile.displayName } : GUEST
    },
    async createProfile(name) {
      const displayName = displayNameSchema.parse(name)
      store.save({ displayName })
      return { kind: 'profile', displayName }
    },
    async signOut() {
      store.remove()
      return GUEST
    },
  }
}
