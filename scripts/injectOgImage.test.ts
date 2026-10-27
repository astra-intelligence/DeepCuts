import { describe, expect, it } from 'vitest'
import { injectOgImageIntoHtml, ogImageMeta } from './injectOgImage.ts'

const SAMPLE = `<!doctype html>
<html lang="en">
  <head>
    <title>Deep Cuts · The B-sides of cinema</title>
    <meta
      property="og:description"
      content="A fast, one-thumb movie tracker for finding films you didn't know existed."
    />
    <meta name="robots" content="noindex, nofollow" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

describe('ogImageMeta', () => {
  it('returns an empty list when no host is configured (ADR-0047: nothing to name)', () => {
    expect(ogImageMeta(undefined)).toEqual([])
    expect(ogImageMeta('')).toEqual([])
  })

  it('builds absolute, https-pinned image URLs from the canonical host', () => {
    const tags = ogImageMeta('deepcuts.example')
    expect(tags).toContain('<meta property="og:image" content="https://deepcuts.example/og-image.png" />')
    expect(tags).toContain('<meta property="og:image:width" content="1200" />')
    expect(tags).toContain('<meta property="og:image:height" content="630" />')
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(tags).toContain('<meta name="twitter:image" content="https://deepcuts.example/og-image.png" />')
  })

  it('strips a scheme or trailing slash if a deploy env passes one', () => {
    expect(ogImageMeta('https://deepcuts.example/')).toContain(
      '<meta property="og:image" content="https://deepcuts.example/og-image.png" />',
    )
  })
})

describe('injectOgImageIntoHtml', () => {
  it('leaves the HTML untouched without a host', () => {
    expect(injectOgImageIntoHtml(SAMPLE, undefined)).toBe(SAMPLE)
  })

  it('inserts the share-card tags right after og:description', () => {
    const out = injectOgImageIntoHtml(SAMPLE, 'deepcuts.example')
    expect(out).toContain('property="og:description"')
    const descIdx = out.indexOf('property="og:description"')
    const imageIdx = out.indexOf('property="og:image"')
    expect(imageIdx).toBeGreaterThan(descIdx)
    expect(out.indexOf('name="robots"')).toBeGreaterThan(imageIdx)
    expect(out).not.toContain('og:image" content="/og-image.png"') // never a relative URL
  })
})