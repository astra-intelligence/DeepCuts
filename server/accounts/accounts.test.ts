// @vitest-environment node
// Tests for the accounts API (ADR-0031, Stage 6 A2/A2b/A3/A6): passkey registration and sign-in,
// invites, sessions, rename/delete, and per-user tags. They run against real SQLite with the real
// migrations (server/testing/fakeD1.ts) and a software passkey that really signs
// (server/testing/softAuthenticator.ts), through the same `/api` guard Pages uses.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, ORIGIN } from '../testing/api'
import { createFakeD1, type FakeD1 } from '../testing/fakeD1'
import { createSoftAuthenticator } from '../testing/softAuthenticator'
import { inviteInsertSql, makeInvite } from './invites'
import { SESSION_COOKIE } from './sessions'

const DAY = 24 * 60 * 60 * 1000
let db: FakeD1
let env: { DB: FakeD1 }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-07T12:00:00Z'))
  db = createFakeD1()
  env = { DB: db }
})
afterEach(() => vi.useRealTimers())

/** Stores a new invite and returns its code. */
async function invite(opts: Parameters<typeof makeInvite>[0] = {}) {
  const i = await makeInvite({ now: Date.now(), ...opts })
  db.exec(inviteInsertSql(i))
  return i.code
}

type Client = ReturnType<typeof createClient>
type Soft = Awaited<ReturnType<typeof createSoftAuthenticator>>

/** The whole sign-up flow: options, the device creates a passkey, verify. */
async function register(client: Client, soft: Soft, code: string, name = 'Mike Curts') {
  const options = await client.call('POST', '/api/auth/register/options', { name, invite: code })
  if (options.status !== 200) return options
  const response = await soft.create(options.body.options, ORIGIN)
  return client.call('POST', '/api/auth/register/verify', {
    challengeId: options.body.challengeId,
    response,
  })
}

/** The whole sign-in flow: options, the device signs, verify. */
async function signIn(client: Client, soft: Soft, origin = ORIGIN) {
  const options = await client.call('POST', '/api/auth/authenticate/options')
  const response = await soft.get(options.body.options, origin)
  return client.call('POST', '/api/auth/authenticate/verify', {
    challengeId: options.body.challengeId,
    response,
  })
}

describe('registration (A2)', () => {
  it('creates the account, claims the invite and starts a session', async () => {
    const client = createClient(env)
    const code = await invite()
    const res = await register(client, await createSoftAuthenticator(), code)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: expect.stringMatching(/^[\w-]{22}$/), name: 'Mike Curts' })
    expect((await client.call('GET', '/api/auth/session')).body).toEqual(res.body)
    expect(db.rows('users')).toHaveLength(1)
    expect(db.rows('passkeys')).toHaveLength(1)
    expect(db.rows('invites')[0]).toMatchObject({ used_at: Date.now(), user_id: res.body.id })
    expect(db.rows('challenges')).toEqual([])
  })

  it('sets a __Host- session cookie: HttpOnly, Secure, SameSite=Lax, Path=/, 30 days', async () => {
    const res = await register(createClient(env), await createSoftAuthenticator(), await invite())
    const cookie = res.response.headers.get('Set-Cookie') ?? ''
    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE}=[\\w-]{43};`))
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=2592000'])
      expect(cookie).toContain(attr)
    expect(cookie).not.toMatch(/Domain=/i)
  })

  it('stores no raw invite code or session id anywhere', async () => {
    const client = createClient(env)
    const code = await invite()
    await register(client, await createSoftAuthenticator(), code)
    const sessionId = client.jar.get(SESSION_COOKIE) ?? ''
    expect(sessionId).toHaveLength(43)
    const everything = JSON.stringify(
      ['users', 'passkeys', 'sessions', 'invites', 'challenges', 'tags'].map((t) => db.rows(t)),
      (_k, v) => (v instanceof Uint8Array ? [...v] : v),
    )
    expect(everything).not.toContain(code)
    expect(everything).not.toContain(sessionId)
  })

  it.each([
    ['missing', async () => 'A'.repeat(22)],
    ['expired', async () => invite({ now: Date.now() - 8 * DAY })],
  ])('refuses a %s invite', async (_label, makeCode) => {
    const res = await register(createClient(env), await createSoftAuthenticator(), await makeCode())
    expect(res).toMatchObject({ status: 400, body: { error: 'invalid_invite' } })
    expect(db.rows('users')).toEqual([])
  })

  it('refuses an invite that was already used', async () => {
    const code = await invite()
    await register(createClient(env), await createSoftAuthenticator(), code)
    const again = await register(createClient(env), await createSoftAuthenticator(), code)
    expect(again).toMatchObject({ status: 400, body: { error: 'invalid_invite' } })
    expect(db.rows('users')).toHaveLength(1)
  })

  it('lets only one of two simultaneous sign-ups use the same invite', async () => {
    const code = await invite()
    const [a, b] = [createClient(env), createClient(env)]
    const [softA, softB] = [await createSoftAuthenticator(), await createSoftAuthenticator()]
    // Both get options before either verifies, as if two people opened the link at once.
    const optA = await a.call('POST', '/api/auth/register/options', { name: 'A', invite: code })
    const optB = await b.call('POST', '/api/auth/register/options', { name: 'B', invite: code })
    const verify = async (c: Client, soft: Soft, opt: typeof optA) =>
      c.call('POST', '/api/auth/register/verify', {
        challengeId: opt.body.challengeId,
        response: await soft.create(opt.body.options, ORIGIN),
      })
    // Both verifies run at once, so both pass the early invite check before either writes; only
    // the claim inside the D1 batch can stop the second.
    const results = await Promise.all([verify(a, softA, optA), verify(b, softB, optB)])
    expect(results.map((r) => r.status).sort()).toEqual([200, 400])
    expect(results.find((r) => r.status === 400)?.body).toEqual({ error: 'invalid_invite' })
    expect(db.rows('users')).toHaveLength(1)
    expect(db.rows('passkeys')).toHaveLength(1)
  })

  it('validates the name and invite shape like the form does', async () => {
    const client = createClient(env)
    for (const body of [{ name: '', invite: 'A'.repeat(22) }, { name: 'x', invite: 'short' }, {}])
      expect((await client.call('POST', '/api/auth/register/options', body)).status).toBe(400)
  })

  it('a recovery invite adds a passkey to the same account', async () => {
    const first = await register(createClient(env), await createSoftAuthenticator(), await invite())
    const userId = first.body.id
    const newPhone = await createSoftAuthenticator()
    const res = await register(createClient(env), newPhone, await invite({ userId }), 'ignored')
    expect(res).toMatchObject({ status: 200, body: { id: userId, name: 'Mike Curts' } })
    expect(db.rows('users')).toHaveLength(1)
    expect(db.rows('passkeys')).toHaveLength(2)
    expect((await signIn(createClient(env), newPhone)).body.id).toBe(userId)
  })
})

describe('WebAuthn checks (A2)', () => {
  it('makes challenges single-use', async () => {
    const client = createClient(env)
    const soft = await createSoftAuthenticator()
    const options = await client.call('POST', '/api/auth/register/options', {
      name: 'Mike',
      invite: await invite(),
    })
    const response = await soft.create(options.body.options, ORIGIN)
    const body = { challengeId: options.body.challengeId, response }
    expect((await client.call('POST', '/api/auth/register/verify', body)).status).toBe(200)
    expect(await client.call('POST', '/api/auth/register/verify', body)).toMatchObject({
      status: 400,
      body: { error: 'verification_failed' },
    })
  })

  it('refuses a challenge older than 5 minutes', async () => {
    await register(createClient(env), await createSoftAuthenticator(), await invite())
    const client = createClient(env)
    const options = await client.call('POST', '/api/auth/authenticate/options')
    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1)
    const res = await client.call('POST', '/api/auth/authenticate/verify', {
      challengeId: options.body.challengeId,
      response: await (await createSoftAuthenticator()).get(options.body.options, ORIGIN),
    })
    expect(res).toMatchObject({ status: 400, body: { error: 'verification_failed' } })
  })

  it('refuses an answer signed for another origin (phishing site)', async () => {
    const soft = await createSoftAuthenticator()
    await register(createClient(env), soft, await invite())
    const res = await signIn(createClient(env), soft, 'https://evil.example')
    expect(res).toMatchObject({ status: 400, body: { error: 'verification_failed' } })
  })

  it('refuses an answer made for another RP ID', async () => {
    const soft = await createSoftAuthenticator()
    await register(createClient(env), soft, await invite())
    const client = createClient(env)
    const options = await client.call('POST', '/api/auth/authenticate/options')
    const response = await soft.get({ ...options.body.options, rpId: 'evil.example' }, ORIGIN)
    const res = await client.call('POST', '/api/auth/authenticate/verify', {
      challengeId: options.body.challengeId,
      response,
    })
    expect(res).toMatchObject({ status: 400, body: { error: 'verification_failed' } })
  })

  it('requires user verification (fingerprint, face or PIN)', async () => {
    const res = await register(
      createClient(env),
      await createSoftAuthenticator({ userVerified: false }),
      await invite(),
    )
    expect(res).toMatchObject({ status: 400, body: { error: 'verification_failed' } })
    expect(db.rows('users')).toEqual([])
  })

  it('refuses a passkey whose signature counter went backwards (cloned)', async () => {
    const soft = await createSoftAuthenticator()
    await register(createClient(env), soft, await invite())
    expect((await signIn(createClient(env), soft)).status).toBe(200)
    expect((await signIn(createClient(env), soft)).status).toBe(200)
    soft.rewind()
    expect((await signIn(createClient(env), soft)).status).toBe(400)
  })

  it('refuses a passkey nobody registered', async () => {
    const res = await signIn(createClient(env), await createSoftAuthenticator())
    expect(res).toMatchObject({ status: 400, body: { error: 'verification_failed' } })
  })
})

describe('sign-in and sessions (A2)', () => {
  it('signs in with a passkey and updates its counter and last use', async () => {
    const soft = await createSoftAuthenticator()
    const reg = await register(createClient(env), soft, await invite())
    const client = createClient(env)
    expect((await signIn(client, soft)).body).toEqual(reg.body)
    expect((await client.call('GET', '/api/auth/session')).body).toEqual(reg.body)
    expect(db.rows('passkeys')[0]).toMatchObject({ counter: 1, last_used_at: Date.now() })
  })

  it('answers 401 with no session, and never caches session answers', async () => {
    const res = await createClient(env).call('GET', '/api/auth/session')
    expect(res).toMatchObject({ status: 401, body: { error: 'signed_out' } })
    expect(res.response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('signs out: deletes the session row and the old cookie stops working', async () => {
    const client = createClient(env)
    await register(client, await createSoftAuthenticator(), await invite())
    const stolen = createClient(env)
    stolen.jar.set(SESSION_COOKIE, client.jar.get(SESSION_COOKIE) ?? '')

    const out = await client.call('POST', '/api/auth/sign-out')
    expect(out.response.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect(db.rows('sessions')).toEqual([])
    expect((await stolen.call('GET', '/api/auth/session')).status).toBe(401)
  })

  it('renews a session past half its life, and ends it after 30 days unused', async () => {
    const client = createClient(env)
    await register(client, await createSoftAuthenticator(), await invite())
    vi.setSystemTime(Date.now() + 10 * DAY)
    expect(
      (await client.call('GET', '/api/auth/session')).response.headers.get('Set-Cookie'),
    ).toBeNull()

    vi.setSystemTime(Date.now() + 6 * DAY) // 16 days in: under half remains
    const renewed = await client.call('GET', '/api/auth/session')
    expect(renewed.response.headers.get('Set-Cookie')).toContain('Max-Age=2592000')
    expect(db.rows('sessions')[0].expires_at).toBe(Date.now() + 30 * DAY)

    vi.setSystemTime(Date.now() + 31 * DAY)
    expect((await client.call('GET', '/api/auth/session')).status).toBe(401)
    expect(db.rows('sessions')).toEqual([])
  })
})

describe('the /api guard', () => {
  it.each([
    ['another site', 'https://evil.example'],
    ['no Origin header', null],
  ])('refuses data-changing requests from %s (CSRF)', async (_label, origin) => {
    const res = await createClient(env, { origin }).call('POST', '/api/auth/authenticate/options')
    expect(res).toMatchObject({ status: 403, body: { error: 'bad_origin' } })
    expect(db.rows('challenges')).toEqual([])
  })

  it('rate-limits sign-in in the tight bucket, and the session check in the general one', async () => {
    const check = vi.fn(async (_key: string, bucket?: string) => ({ allowed: bucket !== 'auth' }))
    const client = createClient({ ...env, RATE_LIMITER: { check } })
    expect((await client.call('POST', '/api/auth/authenticate/options')).status).toBe(429)
    expect((await client.call('GET', '/api/auth/session')).status).toBe(401)
    expect(check.mock.calls.map((c) => c[1])).toEqual(['auth', 'api'])
  })

  it('refuses malformed and oversized bodies', async () => {
    const client = createClient(env)
    await register(client, await createSoftAuthenticator(), await invite())
    expect((await client.call('PATCH', '/api/auth/me', 'not json{')).status).toBe(400)
    expect((await client.call('PATCH', '/api/auth/me', { name: 'x'.repeat(70_000) })).status).toBe(
      413,
    )
  })

  it('answers wrong methods with 405', async () => {
    expect((await createClient(env).call('GET', '/api/auth/sign-out')).status).toBe(405)
  })
})

describe('rename and delete (A2b)', () => {
  it('renames the signed-in user, with the same rule as registration', async () => {
    const client = createClient(env)
    await register(client, await createSoftAuthenticator(), await invite())
    expect((await client.call('PATCH', '/api/auth/me', { name: '   ' })).status).toBe(400)
    expect((await client.call('PATCH', '/api/auth/me', { name: 'x'.repeat(81) })).status).toBe(400)
    expect((await client.call('PATCH', '/api/auth/me', { name: ' Mike ' })).body.name).toBe('Mike')
    expect((await client.call('GET', '/api/auth/session')).body.name).toBe('Mike')
    expect((await createClient(env).call('PATCH', '/api/auth/me', { name: 'X' })).status).toBe(401)
  })

  it("deletes every row of the user's, nothing of anyone else's, and ends the session", async () => {
    const mike = createClient(env)
    const other = createClient(env)
    await register(mike, await createSoftAuthenticator(), await invite())
    const otherUser = await register(other, await createSoftAuthenticator(), await invite())
    await mike.call('PUT', '/api/tags', { tmdbId: 603, tag: 'liked' })
    await other.call('PUT', '/api/tags', { tmdbId: 603, tag: 'liked' })
    const mikeId = (await mike.call('GET', '/api/auth/session')).body.id
    await invite({ userId: mikeId }) // an unused recovery invite
    const stolen = createClient(env)
    stolen.jar.set(SESSION_COOKIE, mike.jar.get(SESSION_COOKIE) ?? '')

    const res = await mike.call('DELETE', '/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.response.headers.get('Set-Cookie')).toContain('Max-Age=0')
    for (const table of ['users', 'passkeys', 'sessions', 'tags', 'invites'])
      expect(JSON.stringify(db.rows(table))).not.toContain(mikeId)
    expect(db.rows('users')).toEqual([expect.objectContaining({ id: otherUser.body.id })])
    expect(db.rows('tags')).toHaveLength(1)
    expect((await stolen.call('GET', '/api/auth/session')).status).toBe(401)
  })
})

describe('tags (A3)', () => {
  async function signedIn() {
    const client = createClient(env)
    await register(client, await createSoftAuthenticator(), await invite())
    return client
  }

  it('applies the tag rules on the server (Dislike removes Like)', async () => {
    const client = await signedIn()
    expect(
      (await client.call('PUT', '/api/tags', { tmdbId: 603, tag: 'liked' })).body.tags,
    ).toEqual(['liked'])
    expect(
      (await client.call('PUT', '/api/tags', { tmdbId: 603, tag: 'disliked' })).body.tags,
    ).toEqual(['disliked'])
    const { records } = (await client.call('GET', '/api/tags')).body
    expect(records).toEqual([
      { tmdbId: 603, tag: 'disliked', createdAt: '2026-10-07T12:00:00.000Z' },
    ])
    expect(
      (await client.call('DELETE', '/api/tags', { tmdbId: 603, tag: 'disliked' })).body.tags,
    ).toEqual([])
  })

  it("keeps each user's tags apart: B can neither read nor change A's", async () => {
    const a = await signedIn()
    const b = await signedIn()
    await a.call('PUT', '/api/tags', { tmdbId: 1, tag: 'seen' })
    expect((await b.call('GET', '/api/tags')).body.records).toEqual([])
    await b.call('DELETE', '/api/tags', { all: true })
    await b.call('DELETE', '/api/tags', { tmdbId: 1, tag: 'seen' })
    expect((await a.call('GET', '/api/tags')).body.records).toHaveLength(1)
  })

  it('ignores a user id sent by the client', async () => {
    const a = await signedIn()
    const b = await signedIn()
    const aId = (await a.call('GET', '/api/auth/session')).body.id
    await b.call('PUT', '/api/tags', { tmdbId: 1, tag: 'seen', userId: aId })
    expect((await a.call('GET', '/api/tags')).body.records).toEqual([])
  })

  it('needs a session', async () => {
    expect((await createClient(env).call('GET', '/api/tags')).status).toBe(401)
    expect(
      (await createClient(env).call('PUT', '/api/tags', { tmdbId: 1, tag: 'seen' })).status,
    ).toBe(401)
  })

  it('imports picks oldest first through the rules, keeping their timestamps', async () => {
    const client = await signedIn()
    await client.call('PUT', '/api/tags', { tmdbId: 9, tag: 'seen' })
    const res = await client.call('POST', '/api/tags/import', {
      records: [
        { tmdbId: 5, tag: 'disliked', createdAt: '2026-01-02T00:00:00.000Z' },
        { tmdbId: 5, tag: 'liked', createdAt: '2026-01-01T00:00:00.000Z' },
        { tmdbId: 7, tag: 'watchlist', createdAt: '2026-01-03T00:00:00.000Z' },
      ],
    })
    expect(res.status).toBe(200)
    expect((await client.call('GET', '/api/tags')).body.records).toEqual([
      { tmdbId: 5, tag: 'disliked', createdAt: '2026-01-02T00:00:00.000Z' },
      { tmdbId: 7, tag: 'watchlist', createdAt: '2026-01-03T00:00:00.000Z' },
      { tmdbId: 9, tag: 'seen', createdAt: '2026-10-07T12:00:00.000Z' },
    ])
  })

  it('caps an import at 5,000 records, and validates each one', async () => {
    const client = await signedIn()
    const record = { tmdbId: 1, tag: 'seen', createdAt: '2026-01-01T00:00:00.000Z' }
    const many = Array.from({ length: 5001 }, (_, i) => ({ ...record, tmdbId: i + 1 }))
    expect((await client.call('POST', '/api/tags/import', { records: many })).status).toBe(400)
    expect(
      (await client.call('POST', '/api/tags/import', { records: many.slice(0, 5000) })).status,
    ).toBe(200)
    expect(db.rows('tags')).toHaveLength(5000)
    const bad = { records: [{ ...record, tag: 'loved' }] }
    expect((await client.call('POST', '/api/tags/import', bad)).status).toBe(400)
  })
})
