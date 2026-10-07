// End-to-end tests in a real browser (Playwright) at 320, 390 and 1280px: every page passes the
// axe accessibility scan with no sideways scrolling, and the main journeys work by keyboard.
// TMDB is never called; e2e/fixtures.ts answers every request with fixed data.
import { expect, expectNoA11yViolations, expectNoHorizontalOverflow, test } from './fixtures'

for (const path of [
  '/sign-in',
  '/search',
  '/search?q=thing',
  '/discover',
  '/movie/1091',
  '/lists',
  '/account',
]) {
  test(`${path} has no axe violations and no horizontal overflow`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoA11yViolations(page)
    await expectNoHorizontalOverflow(page)
  })
}

test('/ redirects to Search', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Find your next film' })).toBeVisible()
})

test('search → detail → back, keyboard only', async ({ page }) => {
  await page.goto('/search')
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
  await expect(page.getByRole('heading', { level: 1, name: 'Results for “thing”' })).toBeVisible()
})

test('search results: open a film from the list and quick-add', async ({ page }) => {
  await page.goto('/search?q=thing')
  const add = page.getByRole('button', { name: 'Want to see The Thing' })
  await add.click()
  await expect(add).toHaveAttribute('aria-pressed', 'true')
  const box = await add.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
})

test('main navigation is reachable and marks the current page', async ({ page }) => {
  await page.goto('/search')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'My Lists' }).click()
  await expect(nav.getByRole('link', { name: 'My Lists' })).toHaveAttribute('aria-current', 'page')
  const box = await nav.getByRole('link', { name: 'My Lists' }).boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
})

test('detail tags toggle by keyboard and meet the 44px target', async ({ page }) => {
  await page.goto('/movie/1091')
  const tags = page.getByRole('group', { name: 'Your tags' })
  const seen = tags.getByRole('button', { name: 'Seen it' })
  await seen.focus()
  await page.keyboard.press('Space')
  await expect(seen).toHaveAttribute('aria-pressed', 'true')
  for (const name of ['Seen it', 'Want to see', 'Like', 'Dislike']) {
    const box = await tags.getByRole('button', { name, exact: true }).boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }
  await expectNoA11yViolations(page)
})

test('a disliked film appears only on the Disliked list, with the tag accent', async ({ page }) => {
  await page.goto('/movie/1091')
  const dislike = page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Dislike' })
  await dislike.click()
  await expect(dislike).toHaveAttribute('aria-pressed', 'true')
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
  await page.goto('/search?q=thing')
  await page.getByRole('button', { name: 'Want to see The Thing' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Want to see The Thing' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  await page.getByRole('button', { name: 'Want to see The Thing' }).click()
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Keep your picks on this device' }).click()
  await page.getByRole('button', { name: 'Save my picks' }).click()
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
  await expectNoA11yViolations(page)
  await page.goto('/search?q=thing')
  await expect(page.getByRole('button', { name: 'Want to see The Thing' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('sign in with the demo account, keyboard only; survives a reload; sign out (ADR-0025)', async ({
  page,
}) => {
  await page.goto('/search?q=thing')
  await page.getByRole('button', { name: 'Want to see The Thing' }).click()
  await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1, name: 'Sign in to Deep Cuts' })).toBeFocused()
  await expect(page.getByText('Practice sign-in. No real account is created.')).toBeVisible()
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: /Continue with a demo account/ }).focus()
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/search\?q=thing$/)
  await expect(page.getByText('Signed in as Mike. Your 1 pick is in your account.')).toBeVisible()
  const chip = page.getByRole('banner').getByRole('link', { name: 'Mike, open your account' })
  await expect(chip).toBeVisible()
  expect((await chip.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await page.reload()
  await expect(chip).toBeVisible()
  await expect(page.getByRole('button', { name: 'Want to see The Thing' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await chip.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Mike Curts' })).toBeVisible()
  await expectNoA11yViolations(page)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('button', { name: 'Yes, sign out' }).click()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('liking a film tunes Discover, with a match and the reason (ADR-0026)', async ({ page }) => {
  await page.goto('/movie/1091')
  const like = page
    .getByRole('group', { name: 'Your tags' })
    .getByRole('button', { name: 'Like', exact: true })
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
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
