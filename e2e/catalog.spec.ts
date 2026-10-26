// End-to-end tests in a real browser (Playwright) at 320, 390 and 1280px: every page passes the
// axe accessibility scan with no sideways scrolling, and the main journeys work by keyboard.
// TMDB is never called; e2e/fixtures.ts answers every request with fixed data.
import type { Page } from '@playwright/test'
import { movieFixture } from '../src/test/msw/fixtures'
import { expect, expectNoA11yViolations, expectNoHorizontalOverflow, test } from './fixtures'

// Sonner's toast area (src/notify.ts): action outcomes ("Saved.", "Signed in as Mike.") show here.
const toasts = (page: Page) => page.getByRole('region', { name: /^Notifications/ })

for (const path of ['/', '/movie/1091', '/lists', '/account']) {
  test(`${path} has no axe violations and no horizontal overflow`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoA11yViolations(page)
    await expectNoHorizontalOverflow(page)
  })
}

test.describe('signed out (ADR-0034)', () => {
  test.use({ signedIn: false })

  for (const path of ['/', '/sign-in', '/register']) {
    test(`${path} has no axe violations and no horizontal overflow`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoA11yViolations(page)
      await expectNoHorizontalOverflow(page)
    })
  }

  test('the landing page bills the three features as tonight’s program (ADR-0040)', async ({
    page,
  }) => {
    await page.goto('/')
    const program = page.getByRole('region', { name: 'Tonight’s program' })
    await expect(program.getByRole('heading', { level: 3 })).toHaveText([
      'Your Top Ten of All Time',
      'My Watchlist',
      'Discover Some Deep Cuts',
    ])
    // No search: it only leads to signed-in pages.
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
    // Two calls to action, both easy to hit, plus the header's Sign in.
    for (const name of ['Get your ticket', 'See the program']) {
      const cta = page.getByRole('main').getByRole('link', { name })
      expect((await cta.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    }
    const signIn = page.getByRole('banner').getByRole('link', { name: 'Sign in' })
    expect((await signIn.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    // "See the program" scrolls the program's heading into view below the sticky header.
    await page.getByRole('link', { name: 'See the program' }).click()
    await expect(program.getByRole('heading', { level: 2 })).toBeInViewport()
    // Three panels side by side at desktop width, stacked on phones.
    const tops = await program
      .getByRole('region')
      .evaluateAll((panels) => panels.map((p) => Math.round(p.getBoundingClientRect().top)))
    const wide = (page.viewportSize()?.width ?? 0) >= 1024
    expect(new Set(tops).size).toBe(wide ? 1 : 3)
  })

  test('a signed-in page sends you to sign in, then back to it', async ({ page }) => {
    await page.goto('/lists?tag=liked')
    await expect(page).toHaveURL(/\/sign-in$/)
    await page.getByRole('button', { name: /Continue with a demo account/ }).click()
    await expect(page).toHaveURL(/\/lists\?tag=liked$/)
    await expect(toasts(page).getByText('Signed in as Mike.')).toBeVisible()
  })
})

test('/ opens Home, and the hidden Search page redirects there (FEATURES.searchPage)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
  ).toBeVisible()
  await page.goto('/search?q=thing')
  await expect(page).toHaveURL(/\/$/)
})

/** Tags The Thing "Want to see" on its Detail page (tags are staged until Save). */
async function wantToSeeTheThing(page: Page) {
  await page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Want to see' })
    .click()
  await page.getByRole('button', { name: 'Save' }).click()
  // Save confirms it in a toast, then closes Detail through its exit transition.
  await expect(toasts(page).getByText(/^Saved\./)).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
}

test('header search → detail → back, keyboard only', async ({ page }) => {
  await page.goto('/')
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

  await expect(page.getByRole('heading', { level: 1, name: 'The Thing' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to previous screen' })).toBeFocused()
  await expect(page.getByRole('img', { name: 'Disney Plus' })).toBeVisible()
  await expect(page).toHaveTitle('The Thing · Deep Cuts')

  await page.goBack()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
  ).toBeVisible()
})

/** Goes to My Lists the way a person would: through the account menu (there's no tab bar). */
async function openMyLists(page: Page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Account menu for / })
    .click()
  await page.getByRole('menuitem', { name: 'My Lists' }).click()
}

test('the account menu is the way to My Lists at every width (ADR-0040)', async ({ page }) => {
  await page.goto('/')
  // No tab bar; the account menu opens by keyboard and passes axe while open.
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  const chip = page.getByRole('banner').getByRole('button', { name: 'Account menu for Mike' })
  expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await chip.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Account menu for Mike' })
  await expect(menu.getByRole('menuitem')).toHaveText(['My Lists', 'Sign out'])
  await expect(menu.getByText('Signed in with the demo account')).toBeVisible()
  await expectNoA11yViolations(page)
  // Escape closes it and puts focus back on the chip.
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(chip).toBeFocused()
  await openMyLists(page)
  await expect(page).toHaveURL(/\/lists$/)
})

test('detail tags toggle and save by keyboard, all at 44px or more', async ({ page }) => {
  await page.goto('/movie/1091')
  const tags = page.getByRole('group', { name: 'Your tags' })
  const want = tags.getByRole('button', { name: 'Want to see' })
  await want.focus()
  await page.keyboard.press('Space')
  await expect(want).toHaveAttribute('aria-pressed', 'true')
  const save = page.getByRole('button', { name: 'Save' })
  const cancel = page.getByRole('button', { name: 'Cancel' })
  // Detail slides in by 8px (animate-enter); measured mid-slide, a 44px button can read as
  // 43.99997px at 320 wide. Let the entrance finish so the sizes are the settled ones.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  )
  for (const target of [
    ...['Want to see', 'Like', 'Dislike'].map((name) =>
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
  // Save follows the tags in Tab order (Like and Dislike come first).
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
  await expect(save).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(toasts(page).getByText('Saved. The Thing: Want to see.')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Your movies, close at hand' }),
  ).toBeFocused()
  await expectNoA11yViolations(page)
})

test.describe('reordering the Top Ten (ADR-0041)', () => {
  // Signed in to the demo account with a Top Ten of three, seeded the way e2e/fixtures.ts signs
  // in: through the new browser context's storage.
  test.use({
    storageState: async ({ baseURL }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin
      const account = { id: 'demo', name: 'Mike Curts', method: 'demo' }
      await use({
        cookies: [],
        origins: [
          {
            origin,
            localStorage: [
              { name: 'deepcuts:v1:account', value: JSON.stringify(account) },
              { name: 'deepcuts:v1:account-demo-top-ten', value: JSON.stringify([1, 2, 3]) },
            ],
          },
        ],
      })
    },
  })
  // Three films, each with its own title (the shared fixture answers every id as The Thing).
  test.beforeEach(async ({ page }) => {
    const titles: Record<string, string> = { '1': 'Alpha', '2': 'Bravo', '3': 'Charlie' }
    await page.route(/\/api\/tmdb\/movie\/(\d+)(\?.*)?$/, (route) => {
      const id = /movie\/(\d+)/.exec(route.request().url())?.[1] ?? ''
      return route.fulfill({ json: { ...movieFixture, id: Number(id), title: titles[id] } })
    })
    await page.goto('/')
  })
  const shelf = (page: Page) => page.getByRole('region', { name: 'Your Top Ten of All Time' })
  const titlesOf = (page: Page) => shelf(page).getByRole('heading', { level: 3 })

  test('works by keyboard and touch-sized buttons at every width, and survives a reload', async ({
    page,
  }, testInfo) => {
    // On the touch project, tap like a phone; elsewhere, use the keyboard alone.
    const touch = testInfo.project.use.hasTouch === true
    // Before reordering the rank is part of each film's link, not its heading.
    await expect(titlesOf(page)).toHaveText(['Alpha', 'Bravo', 'Charlie'])
    const toggle = shelf(page).getByRole('button', { name: 'Reorder' })
    if (touch) await toggle.tap()
    else {
      await toggle.focus()
      await page.keyboard.press('Enter')
    }
    const earlier = shelf(page).getByRole('button', { name: 'Move Charlie earlier' })
    await expect(earlier).toBeVisible()
    // Every move button is a 44px target, and reorder mode still fits 320px without scrolling.
    for (const button of await shelf(page)
      .getByRole('button', { name: /^Move / })
      .all()) {
      const box = await button.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    await expectNoA11yViolations(page)
    await expectNoHorizontalOverflow(page)

    if (touch) await earlier.tap()
    else {
      await earlier.focus()
      await page.keyboard.press('Enter')
    }
    await expect(titlesOf(page)).toHaveText(['#1 Alpha', '#2 Charlie', '#3 Bravo'])
    await expect(shelf(page).getByRole('status')).toHaveText('Charlie moved to #2.')
    if (!touch) await expect(earlier).toBeFocused()

    await page.reload()
    await expect(titlesOf(page)).toHaveText(['Alpha', 'Charlie', 'Bravo'])
  })

  test('a film dragged onto another takes its place', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1280', 'Mouse drag is checked once, on desktop')
    await shelf(page).getByRole('button', { name: 'Reorder' }).click()
    const tile = (title: string) =>
      shelf(page)
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading', { name: title }) })
    await expect(tile('Charlie')).toBeVisible()
    // Drop Charlie on Alpha: Charlie becomes #1, and the others move down one place.
    await tile('Charlie').locator('[draggable]').dragTo(tile('Alpha').locator('[draggable]'))
    await expect(titlesOf(page)).toHaveText(['#1 Charlie', '#2 Alpha', '#3 Bravo'])
    await expect(shelf(page).getByRole('status')).toHaveText('Charlie moved to #1.')
  })
})

test.describe('reordering the watchlist on My Lists (ADR-0041)', () => {
  // Signed in to the demo account with three films on the watchlist (Alpha oldest, Charlie
  // newest), seeded through the new browser context's storage like e2e/fixtures.ts.
  test.use({
    storageState: async ({ baseURL }, use) => {
      const origin = new URL(baseURL ?? 'http://localhost').origin
      const account = { id: 'demo', name: 'Mike Curts', method: 'demo' }
      const records = [1, 2, 3].map((tmdbId) => ({
        tmdbId,
        tag: 'watchlist',
        createdAt: `2026-10-0${tmdbId}T00:00:00.000Z`,
      }))
      await use({
        cookies: [],
        origins: [
          {
            origin,
            localStorage: [
              { name: 'deepcuts:v1:account', value: JSON.stringify(account) },
              { name: 'deepcuts:v1:account-demo-tags', value: JSON.stringify(records) },
            ],
          },
        ],
      })
    },
  })
  test.beforeEach(async ({ page }) => {
    const titles: Record<string, string> = { '1': 'Alpha', '2': 'Bravo', '3': 'Charlie' }
    await page.route(/\/api\/tmdb\/movie\/(\d+)(\?.*)?$/, (route) => {
      const id = /movie\/(\d+)/.exec(route.request().url())?.[1] ?? ''
      return route.fulfill({ json: { ...movieFixture, id: Number(id), title: titles[id] } })
    })
    await page.goto('/lists?tag=watchlist')
  })
  const titlesOf = (page: Page) => page.getByRole('main').getByRole('heading', { level: 3 })

  test('works by keyboard and touch at every width, Escape leaves, and it survives a reload', async ({
    page,
  }, testInfo) => {
    const touch = testInfo.project.use.hasTouch === true
    // Newest first until reordered.
    await expect(titlesOf(page)).toHaveText(['Charlie', 'Bravo', 'Alpha'])
    const toggle = page.getByRole('button', { name: 'Reorder' })
    if (touch) await toggle.tap()
    else {
      await toggle.focus()
      await page.keyboard.press('Enter')
    }
    const earlier = page.getByRole('button', { name: 'Move Alpha earlier' })
    await expect(earlier).toBeVisible()
    for (const button of await page.getByRole('button', { name: /^Move / }).all()) {
      const box = await button.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    await expectNoA11yViolations(page)
    await expectNoHorizontalOverflow(page)

    if (touch) await earlier.tap()
    else {
      await earlier.focus()
      await page.keyboard.press('Enter')
    }
    await expect(titlesOf(page)).toHaveText(['#1 Charlie', '#2 Alpha', '#3 Bravo'])
    if (!touch) {
      await expect(earlier).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Reorder' })).toBeFocused()
    }

    await page.reload()
    await expect(titlesOf(page)).toHaveText(['Charlie', 'Alpha', 'Bravo'])
    // Home's watchlist shelf follows the same order.
    await page.goto('/')
    const shelf = page.getByRole('region', { name: 'My Watchlist' })
    await expect(shelf.getByRole('heading', { level: 3 })).toHaveText(['Charlie', 'Alpha', 'Bravo'])
  })
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
  await expect(toasts(page).getByText(/^Saved\./)).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await openMyLists(page)
  const lists = page.getByRole('navigation', { name: 'Lists' })
  await lists.getByRole('link', { name: /Dislike/ }).click()
  await expect(page.getByRole('link', { name: /The Thing/ })).toBeVisible()
  await expectNoA11yViolations(page)
  await lists.getByRole('link', { name: /Like/ }).click()
  await expect(page.getByText(/will appear here/)).toBeVisible()
})

test.describe('signing in and registering', () => {
  // Both start signed out.
  test.use({ signedIn: false })

  test('sign in with the demo account, keyboard only; survives a reload; sign out (ADR-0025)', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).focus()
    await page.keyboard.press('Enter')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in to Deep Cuts' }),
    ).toBeFocused()
    await expect(page.getByText('Practice sign-in. No real account is created.')).toBeVisible()
    await expectNoA11yViolations(page)
    await page.getByRole('button', { name: /Continue with a demo account/ }).focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/$/)
    await expect(toasts(page).getByText('Signed in as Mike.')).toBeVisible()
    const chip = page.getByRole('banner').getByRole('button', { name: 'Account menu for Mike' })
    await expect(chip).toBeVisible()
    expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(44)

    await page.goto('/movie/1091')
    await wantToSeeTheThing(page)
    await page.reload()
    await expect(chip).toBeVisible()
    // The account keeps the pick: My Lists opens on Want to see.
    await page.goto('/lists')
    await expect(page.getByRole('link', { name: /The Thing/ })).toBeVisible()

    // One press in the menu.
    await chip.click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    // Signing out lands on the landing page, and stays signed out after a reload.
    await expect(page).toHaveURL(/\/$/)
    await expect(toasts(page).getByText('Signed out.')).toBeVisible()
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
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

    await expect(page).toHaveURL(/\/$/)
    await expect(toasts(page).getByText('Account created. Signed in as Ada.')).toBeVisible()
    await page.reload()
    await page.getByRole('banner').getByRole('button', { name: 'Account menu for Ada' }).click()
    await expect(page.getByText('Practice account, made on this device')).toBeVisible()
  })
})

test('liking a film tunes Home’s recommendations, with a match and the reason (ADR-0026)', async ({
  page,
}) => {
  await page.goto('/movie/1091')
  const like = page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Like', exact: true })
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  // Detail stages tag changes until Save.
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(toasts(page).getByText(/^Saved\./)).toBeVisible()
  await page.getByRole('link', { name: 'Deep Cuts, go to Home' }).click()
  // The top pick is the first row in Discovery (no featured card).
  const tile = page
    .getByRole('region', { name: 'Discover Some Deep Cuts' })
    .getByRole('listitem')
    .first()
  const feature = tile.getByRole('link')
  await expect(feature).toContainText(/\d+% match/)
  await expect(page.getByText('Like a few films to tune these picks to you.')).toHaveCount(0)
  // "Why this pick?" opens the full reason (PickReason).
  await tile.getByRole('button', { name: /^Why this pick\?/ }).click()
  await expect(page.getByRole('dialog', { name: /^Why .* was picked$/ })).toContainText('The Thing')
  await page.keyboard.press('Escape')
  await expectNoA11yViolations(page)
  await expectNoHorizontalOverflow(page)

  // The labs are dev-server tools: the live site doesn't link to them or serve them.
  await expect(page.getByRole('link', { name: 'Tune the weights' })).toHaveCount(0)
})

test('tag and genre colors reach the page (runtime CSS variables, ADR-0020/0027)', async ({
  page,
}) => {
  await page.goto('/movie/1091')
  // tagColor() and genreTone() build `var(--color-…)` at runtime, which Tailwind can't see in
  // the source; the generated theme must still emit every one.
  const missing = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const names = ['watchlist', 'liked', 'disliked'].map((t) => `--color-tag-${t}`)
    names.push('--color-genre', '--color-genre-horror', '--color-genre-drama')
    return names.filter((n) => !root.getPropertyValue(n).trim())
  })
  expect(missing).toEqual([])
  // Each unselected toggle's icon wears its own tag color. Compare against the tag's resolved
  // color rather than the label's: Like's tag color is the same near-white as label text.
  const group = page.getByRole('group', { name: 'Your tags' })
  const tags = { 'Want to see': 'watchlist', Like: 'liked', Dislike: 'disliked' }
  for (const [name, tag] of Object.entries(tags)) {
    const button = group.getByRole('button', { name, exact: true })
    const [expected, icon] = await button.evaluate((b, t) => {
      // Resolve the variable through a probe element so both sides are rgb() strings.
      const probe = document.createElement('span')
      probe.style.color = `var(--color-tag-${t})`
      document.body.append(probe)
      const resolved = getComputedStyle(probe).color
      probe.remove()
      return [resolved, getComputedStyle(b.querySelector('svg') as Element).color]
    }, tag)
    expect(icon, name).toBe(expected)
  }
})

test('the dev-only labs are not part of the production site', async ({ page }) => {
  // The weights lab's old live address now goes to Home.
  await page.goto('/discover/weights')
  await expect(page).toHaveURL(/\/$/)
  for (const path of ['/lab/weights', '/lab/vhs']) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeVisible()
  }
})
