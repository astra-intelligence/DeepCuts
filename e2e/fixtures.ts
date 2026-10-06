import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'
import { movieFixture, providersFixture, searchFixture } from '../src/test/msw/fixtures'

// E2E never calls TMDB: the proxy is stubbed with the same fixtures as unit tests,
// and CDN images are aborted.
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route('**/api/tmdb/search/movie**', (route) =>
      route.fulfill({ json: searchFixture }),
    )
    await page.route('**/api/tmdb/movie/*/watch/providers', (route) =>
      route.fulfill({ json: providersFixture }),
    )
    await page.route(/\/api\/tmdb\/movie\/\d+$/, (route) => route.fulfill({ json: movieFixture }))
    await page.route('https://image.tmdb.org/**', (route) => route.abort())
    await use(page)
  },
})

export { expect }

export async function expectNoA11yViolations(page: Page, disableRules: string[] = []) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .disableRules(disableRules)
    .analyze()
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
  ).toEqual([])
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}
