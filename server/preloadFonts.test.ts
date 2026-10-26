// Tests for the font preload build plugin: it preloads the four Latin font files only, with the
// attributes a font preload needs, and fails the build when the set of fonts changes.
import { describe, expect, it } from 'vitest'
import { fontPreloadTags } from './preloadFonts.ts'

const LATIN = [
  'assets/anton-latin-400-normal-Byf51wtH.woff2',
  'assets/courier-prime-latin-400-normal-BbyBr73r.woff2',
  'assets/courier-prime-latin-700-normal-D1YCjmaD.woff2',
  'assets/special-elite-latin-400-normal-YjDd9tmf.woff2',
]

describe('fontPreloadTags', () => {
  it('preloads the Latin fonts only, as CORS font requests', () => {
    const tags = fontPreloadTags([
      'index.html',
      'assets/index-1_nwiA3b.css',
      'assets/anton-latin-ext-400-normal-SyiqE2Jt.woff2',
      'assets/anton-vietnamese-400-normal-CkBxLiRJ.woff2',
      ...LATIN,
    ])
    expect(tags.map((t) => t.attrs?.href)).toEqual(LATIN.map((f) => `/${f}`))
    expect(tags[0]).toEqual({
      tag: 'link',
      attrs: {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: `/${LATIN[0]}`,
        crossorigin: '',
      },
      injectTo: 'head',
    })
  })

  it('fails the build when a font is added or removed', () => {
    expect(() => fontPreloadTags(LATIN.slice(1))).toThrow(/expected 4 Latin font files, found 3/)
  })
})
