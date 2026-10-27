// Writes the Open Graph share-card meta tags into dist/index.html, after the
// Vite build (issue #46). The og:image URL is absolute only when the deploy
// environment provides CANONICAL_HOST (the same secret the API's host pin
// reads, ADR-0047); local/dev builds leave index.html unchanged. Mirrors
// scripts/generate-headers.mjs: part of `npm run build`, never hand-written.
import { readFileSync, writeFileSync } from 'node:fs'
import { injectOgImageIntoHtml } from './injectOgImage.ts'

const HOST = process.env.CANONICAL_HOST

const file = 'dist/index.html'
const html = readFileSync(file, 'utf8')
const out = injectOgImageIntoHtml(html, HOST)

if (out === html) {
  console.log('dist/index.html left unchanged (no CANONICAL_HOST; og:image omitted)')
} else {
  writeFileSync(file, out)
  console.log(`wrote og:image share tags into ${file} (CANONICAL_HOST=${HOST})`)
}