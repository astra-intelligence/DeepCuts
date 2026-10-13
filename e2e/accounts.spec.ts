// End-to-end test of real accounts (ADR-0031, Stage 6 A6), run by `npm run e2e:cf` against
// `wrangler pages dev` with a local D1 database and the rate-limit Worker. Chromium's virtual
// authenticator (Chrome DevTools Protocol, `WebAuthn.addVirtualAuthenticator`) stands in for a
// phone or laptop: it creates and uses real passkeys, with user verification.
//
// One flow, start to finish: invite → register → reload (still signed in) → sign out → sign in
// with the passkey → the lists are still there. Then axe on the account pages at all three widths.
import { execFileSync } from 'node:child_process'
import type { Page } from '@playwright/test'
import { expect, expectNoA11yViolations, test } from './fixtures'

// The flow shares one server-side rate limit (10 sign-in requests a minute), so run in order.
test.describe.configure({ mode: 'serial' })
// These tests start signed out: they register and sign in themselves.
test.use({ signedIn: false })

/** Creates a local invite with the real script and returns its path (`/register?invite=…`). */
function newInvitePath(): string {
  const out = execFileSync('node', ['scripts/invite.mjs'], { encoding: 'utf8' })
  const link = out.match(/http:\/\/localhost:8788(\/register\?invite=[\w-]{22})/)
  if (!link?.[1]) throw new Error(`No invite link in:\n${out}`)
  return link[1]
}

/** Gives the page a passkey-capable "device" (Chromium only). */
async function addAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
}

test('invite → register → reload → sign out → sign in with the passkey', async ({ page }) => {
  await addAuthenticator(page)

  // Register from an invite link. The code is filled in, then removed from the address bar.
  await page.goto(newInvitePath())
  await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByText(/No passkey or real account is created/)).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace')
  await page.getByRole('button', { name: 'Create passkey' }).click()
  await expect(page).not.toHaveURL(/\/register/)

  // A real session: it survives a reload, and the Account page shows a passkey account.
  await page.goto('/account')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Ada Lovelace' })).toBeVisible()
  await expect(page.getByText('Signed in with a passkey')).toBeVisible()

  // Tag a film through the app's own API call (same origin, the session cookie rides along).
  const put = await page.evaluate(() =>
    fetch('/api/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: 1091, tag: 'liked' }),
    }).then((r) => r.status),
  )
  expect(put).toBe(200)

  // The cookie is invisible to the page's JavaScript (HttpOnly).
  expect(await page.evaluate(() => document.cookie)).not.toContain('dc_session')

  // Sign out from the header's account menu (desktop width, one press), then the session is gone.
  await page.getByRole('banner').getByRole('button', { name: 'Account menu for Ada' }).click()
  await expect(page.getByRole('menuitem', { name: 'Account settings' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)
  expect((await page.request.get('/api/auth/session')).status()).toBe(401)

  // Sign in with the passkey: one button, no username.
  await page.goto('/sign-in')
  await page.getByRole('button', { name: /Sign in with a passkey/ }).click()
  await expect(page).not.toHaveURL(/\/sign-in/)
  const session = await page.request.get('/api/auth/session')
  expect(await session.json()).toMatchObject({ name: 'Ada Lovelace' })

  // The lists are still there.
  const tags = await (await page.request.get('/api/tags')).json()
  expect(tags.records).toEqual([expect.objectContaining({ tmdbId: 1091, tag: 'liked' })])
})

test('a used invite is refused on the invite field', async ({ page }) => {
  await addAuthenticator(page)
  const invite = newInvitePath()
  await page.goto(invite)
  await page.getByRole('textbox', { name: 'Name' }).fill('First')
  await page.getByRole('button', { name: 'Create passkey' }).click()
  await expect(page).not.toHaveURL(/\/register/)
  await page.context().clearCookies()

  await page.goto(invite)
  await page.getByRole('textbox', { name: 'Name' }).fill('Second')
  await page.getByRole('button', { name: 'Create passkey' }).click()
  await expect(page.getByRole('textbox', { name: 'Invite code' })).toHaveAccessibleDescription(
    /may have expired or been used already/,
  )
})

for (const [width, height] of [
  [320, 640],
  [390, 844],
  [1280, 800],
] as const) {
  test(`register and sign-in pages pass axe at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/register')
    await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible()
    await expectNoA11yViolations(page)
    await page.goto('/sign-in')
    await expect(page.getByRole('button', { name: /Sign in with a passkey/ })).toBeVisible()
    await expectNoA11yViolations(page)
  })
}
