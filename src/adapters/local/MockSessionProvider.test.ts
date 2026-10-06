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

it('versionedStore runs the migration hook before validating', () => {
  localStorage.setItem('deepcuts:v1:n', '"41"')
  const store = versionedStore({ key: 'n', schema: z.number(), fallback: 0, migrate: Number })
  expect(store.load()).toBe(41)
})
