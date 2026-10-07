// Tests for the local session provider: the shared SessionProvider contract, a saved profile
// surviving a new instance, a stale demo account name being refreshed, registration never
// storing the email or password, and versionedStore's migration hook.
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

it('registration stores only the name, never the email or password (ADR-0030)', async () => {
  await createMockSessionProvider().register({
    name: 'Ada',
    email: 'ada@example.com',
    password: 'correct horse battery',
  })
  // Everything this provider wrote to the browser, as one string.
  const stored = Object.keys(localStorage)
    .map((k) => `${k}=${localStorage.getItem(k)}`)
    .join('\n')
  expect(stored).toContain('Ada')
  expect(stored).not.toContain('ada@example.com')
  expect(stored).not.toContain('correct horse battery')
})

it('versionedStore runs the migration hook before validating', () => {
  localStorage.setItem('deepcuts:v1:n', '"41"')
  const store = versionedStore({ key: 'n', schema: z.number(), fallback: 0, migrate: Number })
  expect(store.load()).toBe(41)
})
