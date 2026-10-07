// End-to-end tests in a real browser (Playwright) at 320, 390 and 1280px: every page passes the
// axe accessibility scan with no sideways scrolling, and the main journeys work by keyboard.
// TMDB is never called; e2e/fixtures.ts answers every request with fixed data.
import type { Page } from '@playwright/test'
import { expect, expectNoA11yViolations, expectNoHorizontalOverflow, test } from './fixtures'

for (const path of ['/sign-in', '/register', '/discover', '/movie/1091', '/lists', '/account']) {
  test(`${path} has no axe violations and no horizontal overflow`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoA11yViolations(page)
    await expectNoHorizontalOverflow(page)
  })
}

test('/ opens Discover, and the hidden Search page redirects there (FEATURES.searchPage)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/discover$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Found for you' })).toBeVisible()
  await page.goto('/search?q=thing')
  await expect(page).toHaveURL(/\/discover$/)
})

/** Tags The Thing "Want to see" on its Detail page (tags are staged until Save). */
async function wantToSeeTheThing(page: Page) {
  await page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Want to see' })
    .click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status')).toContainText('Saved.')
}

test('header search → detail → back, keyboard only', async ({ page }) => {
  await page.goto('/discover')
  const box = page.getByRole('combobox', { name: 'Find a movie to view and tag' })
  await box.focus()
  await page.keyboard.type('thing')
  await expect(page.getByRole('option', { name: /The Thing/ })).toBeVisible()
  // The suggestion list spans the whole search field, not just the text input (regression).
  const field = await page.getByRole('search').boundingBox()
  const list = await page.getByRole('listbox', { name: 'Movie suggestions' }).boundingBox()
  // (allowing for the popover’s own padding and border around the list)
  expect(list?.width).toBeGreaterThanOrEqual((field?.width ?? 0) - 12)
  // While the list is open, React Aria hides the rest of the page from screen readers by design.
  // Focus can't reach it (Tab/Escape close the list first), which axe can't see, so only that
  // rule is skipped for this scan.
  await expectNoA11yViolations(page, ['aria-hidden-focus'])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  const heading = page.getByRole('heading', { level: 1, name: 'The Thing' })
  await expect(heading).toBeFocused()
  await expect(page.getByRole('img', { name: 'Disney Plus' })).toBeVisible()
  await expect(page).toHaveTitle('The Thing · Deep Cuts')

  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Found for you' })).toBeVisible()
})

test('main navigation is reachable and marks the current page', async ({ page }) => {
  await page.goto('/discover')
  const nav = page.getByRole('navigation', { name: 'Main' })
  // Two tabs while the Search page is hidden.
  await expect(nav.getByRole('link')).toHaveText(['Discover', 'My Lists'])
  await nav.getByRole('link', { name: 'My Lists' }).click()
  await expect(nav.getByRole('link', { name: 'My Lists' })).toHaveAttribute('aria-current', 'page')
  const box = await nav.getByRole('link', { name: 'My Lists' }).boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
})

test('detail tags toggle and save by keyboard, all at 44px or more', async ({ page }) => {
  await page.goto('/movie/1091')
  const tags = page.getByRole('group', { name: 'Your tags' })
  const seen = tags.getByRole('button', { name: 'Seen it' })
  await seen.focus()
  await page.keyboard.press('Space')
  await expect(seen).toHaveAttribute('aria-pressed', 'true')
  const save = page.getByRole('button', { name: 'Save' })
  const cancel = page.getByRole('button', { name: 'Cancel' })
  for (const target of [
    ...['Seen it', 'Want to see', 'Like', 'Dislike'].map((name) =>
      tags.getByRole('button', { name, exact: true }),
    ),
    save,
    cancel,
  ]) {
    const box = await target.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }
  await expectNoA11yViolations(page)
  await expectNoHorizontalOverflow(page)
  // Save follows the tags in Tab order (Want to see, Like and Dislike come first).
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  await expect(save).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Saved. The Thing: Seen it.')
  await expect(seen).toBeFocused()
  await expect(save).toHaveCount(0)
  await expectNoA11yViolations(page)
})

test('a disliked film appears only on the Disliked list, with the tag accent', async ({ page }) => {
  await page.goto('/movie/1091')
  const dislike = page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Dislike' })
  await dislike.click()
  await expect(dislike).toHaveAttribute('aria-pressed', 'true')
  // Detail stages tag changes until Save.
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status')).toContainText('Saved.')
  // Client-side navigation keeps the in-memory guest picks (ADR-0011).
  await page.getByRole('link', { name: 'Deep Cuts, go to Discover' }).click()
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'My Lists' })
    .click()
  const lists = page.getByRole('navigation', { name: 'Lists' })
  await lists.getByRole('link', { name: /Dislike/ }).click()
  await expect(page.getByRole('link', { name: /The Thing/ })).toBeVisible()
  await expectNoA11yViolations(page)
  await lists.getByRole('link', { name: /Seen it/ }).click()
  await expect(page.getByText(/will appear here/)).toBeVisible()
})

test('Save my picks survives a reload; guest picks do not (ADR-0011, ADR-0022)', async ({
  page,
}) => {
  await page.goto('/movie/1091')
  await wantToSeeTheThing(page)
  await page.reload()
  const wanted = page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Want to see' })
  await expect(wanted).toHaveAttribute('aria-pressed', 'false')

  await wantToSeeTheThing(page)
  // Client-side navigation keeps the in-memory guest picks (ADR-0011).
  await page.getByRole('link', { name: 'Deep Cuts, go to Discover' }).click()
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Keep your picks on this device' }).click()
  await page.getByRole('button', { name: 'Save my picks' }).click()
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
  await expectNoA11yViolations(page)
  await page.goto('/movie/1091')
  await expect(wanted).toHaveAttribute('aria-pressed', 'true')
})

test('sign in with the demo account, keyboard only; survives a reload; sign out (ADR-0025)', async ({
  page,
}) => {
  await page.goto('/movie/1091')
  await wantToSeeTheThing(page)
  await page.getByRole('link', { name: 'Deep Cuts, go to Discover' }).click()
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Deep Cuts' })).toBeFocused()
  await expect(page.getByText('Practice sign-in. No real account is created.')).toBeVisible()
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: /Continue with a demo account/ }).focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/discover$/)
  await expect(page.getByText('Signed in as Mike. Your 1 pick is in your account.')).toBeVisible()
  const chip = page.getByRole('banner').getByRole('link', { name: 'Mike, open your account' })
  await expect(chip).toBeVisible()
  expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await page.reload()
  await expect(chip).toBeVisible()
  // The pick moved into the account: My Lists opens on Want to see.
  await page.goto('/lists')
  await expect(page.getByRole('link', { name: /The Thing/ })).toBeVisible()

  await chip.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Mike Curts' })).toBeVisible()
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('button', { name: 'Yes, sign out' }).click()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('register from an invite link with the keyboard; errors pass axe; the practice account survives a reload (ADR-0031)', async ({
  page,
}) => {
  // Submitting with no invite shows the errors and puts the cursor in the first field.
  await page.goto('/register')
  await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible()
  await page.getByRole('button', { name: 'Create passkey' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused()
  await expect(page.getByText('Enter the code from your invite link.')).toBeVisible()
  await expectNoA11yViolations(page)
  await expectNoHorizontalOverflow(page)

  // An invite link fills in the code, then the code leaves the address bar.
  await page.goto('/register?invite=AAAAAAAAAAAAAAAAAAAAAA')
  await expect(page.getByRole('textbox', { name: 'Invite code' })).toHaveValue(
    'AAAAAAAAAAAAAAAAAAAAAA',
  )
  await expect(page).toHaveURL(/\/register$/)
  await page.getByRole('textbox', { name: 'Name' }).focus()
  await page.keyboard.type('Ada Lovelace')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/discover$/)
  await expect(page.getByText('Signed in as Ada.')).toBeVisible()
  await page.reload()
  const chip = page.getByRole('banner').getByRole('link', { name: 'Ada, open your account' })
  await chip.click()
  await expect(page.getByText('Practice account, made on this device')).toBeVisible()
})

test('liking a film tunes Discover, with a match and the reason (ADR-0026)', async ({ page }) => {
  await page.goto('/movie/1091')
  const like = page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Like', exact: true })
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  // Detail stages tag changes until Save.
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status')).toContainText('Saved.')
  // Client-side navigation keeps the in-memory guest picks (ADR-0011).
  await page.getByRole('link', { name: 'Deep Cuts, go to Discover' }).click()
  await expect(page.getByText('Picked from the films you liked, beyond the obvious.')).toBeVisible()
  const feature = page.getByRole('link', { name: /Today’s featured deep cut/ })
  await expect(feature).toContainText(/\d+% match/)
  await expect(feature).toContainText('Because you liked The Thing')
  await expectNoA11yViolations(page)
  await expectNoHorizontalOverflow(page)

  // The weights lab re-ranks the same picks live; settings go in the URL.
  await page.getByRole('link', { name: 'Tune the weights' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tune the weights' })).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
  const deepCut = page.getByRole('slider', { name: 'Deep cut' })
  await deepCut.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/deepCut=13/)
  await expectNoA11yViolations(page)
  await expectNoHorizontalOverflow(page)
})

test('tag and genre colors reach the page (runtime CSS variables, ADR-0020/0027)', async ({
  page,
}) => {
  await page.goto('/movie/1091')
  // tagColor() and genreTone() build `var(--color-…)` at runtime, which Tailwind can't see in
  // the source; the generated theme must still emit every one.
  const missing = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const names = ['seen', 'watchlist', 'liked', 'disliked'].map((t) => `--color-tag-${t}`)
    names.push('--color-genre', '--color-genre-horror', '--color-genre-drama')
    return names.filter((n) => !root.getPropertyValue(n).trim())
  })
  expect(missing).toEqual([])
  // Each unselected toggle's icon wears its tag color, not the button's muted text color.
  const group = page.getByRole('group', { name: 'Your tags' })
  for (const name of ['Seen it', 'Want to see', 'Like', 'Dislike']) {
    const button = group.getByRole('button', { name, exact: true })
    const [text, icon] = await button.evaluate((b) => [
      getComputedStyle(b).color,
      getComputedStyle(b.querySelector('svg') as Element).color,
    ])
    expect(icon, name).not.toBe(text)
  }
})
