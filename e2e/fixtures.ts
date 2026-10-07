// Shared setup for every E2E test: fake TMDB responses, and two reusable checks
// (accessibility scan, no sideways scrolling).
import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'
import { movieFixture, providersFixture, searchFixture } from '../src/test/msw/fixtures'

// E2E never calls TMDB: the proxy is stubbed with the same fixtures as unit tests,
// and CDN images are aborted. Playwright tries the most recently added route first, so the
// catch-all below is registered first and only fires for requests no fixture matches.
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route('**/api/tmdb/**', (route) => {
      // Fail loudly instead of falling through to the real proxy (and live TMDB, when a
      // developer has a token in .env.local).
      throw new Error(`Unmocked TMDB request in E2E: ${route.request().url()}`)
    })
    await page.route('**/api/tmdb/search/movie**', (route) =>
      route.fulfill({ json: searchFixture }),
    )
    await page.route('**/api/tmdb/discover/movie**', (route) =>
      route.fulfill({ json: searchFixture }),
    )
    await page.route('**/api/tmdb/movie/*/watch/providers', (route) =>
      route.fulfill({ json: providersFixture }),
    )
    await page.route(/\/api\/tmdb\/movie\/\d+(\?.*)?$/, (route) =>
      route.fulfill({ json: movieFixture }),
    )
    await page.route('https://image.tmdb.org/**', (route) => route.abort())
    await use(page)
  },
})

export { expect }

/** Fails the test if axe finds any WCAG 2.2 A/AA violation on the page (ADR-0009). */
export async function expectNoA11yViolations(page: Page, disableRules: string[] = []) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .disableRules(disableRules)
    .analyze()
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
  ).toEqual([])
}

/** Fails the test if the page scrolls sideways (WCAG 1.4.10 reflow, ADR-0021). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}
