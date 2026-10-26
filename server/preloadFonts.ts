// Build plugin: preloads the app's four web fonts from index.html. Without it the browser only
// discovers a font once text using it is on screen, so the first paint uses the fallback fonts and
// every heading reflows when Anton arrives (a visible jump, ADR-0040's display face). Preloading
// starts the downloads with the stylesheet, so the fonts are usually ready for the first paint.
// No extra bytes: every page already loads these four files.
//
// Only the Latin files: the other subsets (Latin Extended, Vietnamese) load on demand, only for
// text that needs them (their CSS `unicode-range`). Build only: in dev the fonts aren't bundled.
import type { HtmlTagDescriptor, Plugin } from 'vite'

// The Latin file of each face and weight the app imports (src/index.css), as Vite names them.
const LATIN_FONT = /^assets\/[a-z-]+-latin-\d{3}-normal-[\w-]+\.woff2$/
// One per face and weight in src/index.css: Anton, Special Elite, Courier Prime 400 and 700.
const EXPECTED = 4

/**
 * The `<link rel="preload">` tags for the Latin font files among the build's output files.
 * @throws When the count isn't the expected four (a font was added, removed or renamed): the
 *   build fails so this list is checked, rather than quietly preloading too much or too little.
 */
export function fontPreloadTags(files: readonly string[]): HtmlTagDescriptor[] {
  const fonts = files.filter((f) => LATIN_FONT.test(f)).sort()
  if (fonts.length !== EXPECTED) {
    throw new Error(
      `preloadFonts: expected ${EXPECTED} Latin font files, found ${fonts.length}: ${fonts.join(', ')}`,
    )
  }
  return fonts.map((href) => ({
    tag: 'link',
    // Fonts are always fetched in CORS mode, so the preload needs `crossorigin` to be reused.
    attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${href}`, crossorigin: '' },
    injectTo: 'head',
  }))
}

/** The plugin for vite.config.ts. */
export function preloadFonts(): Plugin {
  return {
    name: 'deep-cuts:preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      // After the bundle is written, so the hashed font file names are known.
      order: 'post',
      handler: (_html, { bundle }) => fontPreloadTags(Object.keys(bundle ?? {})),
    },
  }
}
