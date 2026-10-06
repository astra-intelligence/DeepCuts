// Shared contract suite (ADR-0013): every SessionProvider implementation must pass it unchanged.
import { describe, expect, it } from 'vitest'
import type { SessionProvider } from './SessionProvider'

export function sessionProviderContract(name: string, make: () => SessionProvider) {
  describe(`SessionProvider contract: ${name}`, () => {
    it('starts as a guest', async () => {
      expect(await make().getSession()).toEqual({ kind: 'guest' })
    })

    it('creates a profile with a trimmed name and signs out again', async () => {
      const provider = make()
      expect(await provider.createProfile('  Mike ')).toEqual({
        kind: 'profile',
        displayName: 'Mike',
      })
      expect(await provider.getSession()).toEqual({ kind: 'profile', displayName: 'Mike' })
      expect(await provider.signOut()).toEqual({ kind: 'guest' })
      expect(await provider.getSession()).toEqual({ kind: 'guest' })
    })

    it.each(['', '   ', 'x'.repeat(41)])('rejects the name %j', async (bad) => {
      await expect(make().createProfile(bad)).rejects.toThrow()
    })
  })
}
