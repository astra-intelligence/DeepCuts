// Tests for the local session provider: the shared SessionProvider contract, a saved profile
// surviving a new instance, a stale demo account name being refreshed, and versionedStore's
// migration hook.
import { beforeEach, expect, it } from 'vitest'
import { sessionProviderContract } from '../sessionProvider.contract'
import { createMockSessionProvider } from './MockSessionProvider'
import { versionedStore } from './versionedStore'
import { z } from 'zod'

beforeEach(() => localStorage.clear())

sessionProviderContract('MockSessionProvider', () => createMockSessionProvider())

it('a profile survives a new instance (saved on this device)', async () => {
  await createMockSessionProvider().createProfile('Mike')
  expect(await createMockSessionProvider().getSession()).toEqual({
    kind: 'profile',
    displayName: 'Mike',
  })
})

it('a demo account saved under an old name comes back with the current name', async () => {
  // What a browser that signed in before the rename still has stored.
  localStorage.setItem(
    'deepcuts:v1:account',
    JSON.stringify({ id: 'demo', name: 'Alex Rivera', method: 'demo' }),
  )
  expect(await createMockSessionProvider().getSession()).toEqual({
    kind: 'account',
    account: { id: 'demo', name: 'Mike Curts', method: 'demo' },
  })
})

it('versionedStore runs the migration hook before validating', () => {
  localStorage.setItem('deepcuts:v1:n', '"41"')
  const store = versionedStore({ key: 'n', schema: z.number(), fallback: 0, migrate: Number })
  expect(store.load()).toBe(41)
})
