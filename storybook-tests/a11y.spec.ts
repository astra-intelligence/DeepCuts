// The Storybook accessibility gate (ADR-0007, ADR-0010): every story in the built Storybook must
// have zero axe violations (WCAG 2.2 A/AA), checked on the story itself, not Storybook's UI.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Storybook's build lists every story in index.json.
const index = JSON.parse(readFileSync('storybook-static/index.json', 'utf8')) as {
  entries: Record<string, { id: string; title: string; name: string; type: string }>
}
const stories = Object.values(index.entries).filter((e) => e.type === 'story')

test('Storybook has stories', () => {
  expect(stories.length).toBeGreaterThan(0)
})

for (const story of stories) {
  test(`${story.title} › ${story.name} has no axe violations`, async ({ page }) => {
    // Images from TMDB's CDN aren't needed to check accessibility; don't fetch them.
    await page.route('https://image.tmdb.org/**', (route) => route.abort())
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`)
    await expect(page.locator('#storybook-root > *').first()).toBeVisible()
    const results = await new AxeBuilder({ page })
      .include('#storybook-root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(
      results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
    ).toEqual([])
  })
}
