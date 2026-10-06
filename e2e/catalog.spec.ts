import { expect, expectNoA11yViolations, expectNoHorizontalOverflow, test } from './fixtures'

for (const path of ['/', '/search', '/search?q=thing', '/movie/1091', '/lists']) {
  test(`${path} has no axe violations and no horizontal overflow`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoA11yViolations(page)
    await expectNoHorizontalOverflow(page)
  })
}

test('search → detail → back, keyboard only', async ({ page }) => {
  await page.goto('/search')
  await page.getByRole('searchbox', { name: 'Film title' }).focus()
  await page.keyboard.type('thing')
  const result = page.getByRole('link', { name: /The Thing/ })
  await expect(result).toBeVisible()
  await result.focus()
  await page.keyboard.press('Enter')

  const heading = page.getByRole('heading', { level: 1, name: 'The Thing' })
  await expect(heading).toBeFocused()
  await expect(page.getByText('Disney Plus')).toBeVisible()
  await expect(page).toHaveTitle('The Thing · Deep Cuts')

  await page.getByRole('link', { name: 'Back to search' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeFocused()
})

test('main navigation is reachable and marks the current page', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'My Lists' }).click()
  await expect(nav.getByRole('link', { name: 'My Lists' })).toHaveAttribute('aria-current', 'page')
  const box = await nav.getByRole('link', { name: 'My Lists' }).boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
})
