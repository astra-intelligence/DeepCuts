// Tests for the seasonal tab icon: swapped in season, left alone the rest of the year.
import { beforeEach, describe, expect, it } from 'vitest'
import { applySeasonalFavicon } from './seasonalLogos'

const svgIcon = () => document.querySelector<HTMLLinkElement>('link[type="image/svg+xml"]')

describe('applySeasonalFavicon', () => {
  beforeEach(() => {
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />'
  })

  it('shows the Halloween icon in October', () => {
    applySeasonalFavicon(new Date(2026, 9, 13))
    expect(svgIcon()?.getAttribute('href')).toBe('/favicon-halloween.svg')
  })

  it('keeps the standard icon out of season', () => {
    applySeasonalFavicon(new Date(2026, 10, 1))
    expect(svgIcon()?.getAttribute('href')).toBe('/favicon.svg')
  })

  it('does nothing when the page has no SVG icon', () => {
    document.head.innerHTML = ''
    expect(() => applySeasonalFavicon(new Date(2026, 9, 13))).not.toThrow()
  })
})
