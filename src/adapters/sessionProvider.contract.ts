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

    it('creates a profile without a name (ADR-0022)', async () => {
      const provider = make()
      expect(await provider.createProfile()).toEqual({ kind: 'profile', displayName: '' })
      expect(await provider.createProfile('   ')).toEqual({ kind: 'profile', displayName: '' })
      expect(await provider.getSession()).toEqual({ kind: 'profile', displayName: '' })
    })

    it('rejects an over-long name', async () => {
      await expect(make().createProfile('x'.repeat(41))).rejects.toThrow()
    })

    it('offers at least one sign-in method, each with a label and description', () => {
      const methods = make().signInMethods()
      expect(methods.length).toBeGreaterThan(0)
      for (const m of methods) {
        expect(m.label).not.toBe('')
        expect(m.description).not.toBe('')
      }
    })

    it('signs in with an offered method, survives a reload, and signs out to guest (ADR-0025)', async () => {
      const provider = make()
      await provider.createProfile()
      const method = provider.signInMethods()[0]
      if (!method) throw new Error('no sign-in method offered')
      const session = await provider.signIn(method.id)
      expect(session.kind).toBe('account')
      expect(await make().getSession()).toEqual(session)
      expect(await provider.signOut()).toEqual({ kind: 'guest' })
      expect(await make().getSession()).toEqual({ kind: 'guest' })
    })

    it('registers an account that survives a reload, and signs out to guest (ADR-0031)', async () => {
      const provider = make()
      const session = await provider.register({
        name: '  Ada Lovelace ',
        invite: 'AAAAAAAAAAAAAAAAAAAAAA',
      })
      expect(session).toMatchObject({ kind: 'account', account: { name: 'Ada Lovelace' } })
      expect(await make().getSession()).toEqual(session)
      expect(await provider.signOut()).toEqual({ kind: 'guest' })
    })

    it('rejects invalid registration details', async () => {
      const valid = { name: 'Ada', invite: 'AAAAAAAAAAAAAAAAAAAAAA' }
      await expect(make().register({ ...valid, name: '  ' })).rejects.toThrow()
      await expect(make().register({ ...valid, invite: '' })).rejects.toThrow()
      await expect(make().register({ ...valid, invite: 'short' })).rejects.toThrow()
      await expect(
        make().register({ ...valid, invite: '<script>AAAAAAAAAAAAAA' }),
      ).rejects.toThrow()
      expect(await make().getSession()).toEqual({ kind: 'guest' })
    })

    it('rejects a method it does not offer', async () => {
      // @ts-expect-error -- a method id the provider doesn't know
      await expect(make().signIn('carrier-pigeon')).rejects.toThrow()
    })
  })
}
