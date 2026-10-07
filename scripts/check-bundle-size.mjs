// Bundle size budget (runs after `npm run build`, part of `npm run verify` and CI).
//
// Fails when the production build grows past these limits, so growth is a decision, not an
// accident. Sizes are gzipped, which is roughly what a browser downloads. To see what's inside
// the bundle, run `npm run analyze` and open build/bundle-report.html.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

// Limits in kB (gzipped). Measured 2026-10-07: first visit 217 kB, of which ~198 kB is the
// framework (React, React Aria, React Router, Zod, TanStack Query); pages are 2–8 kB each.
const BUDGET = {
  /** Everything the landing page loads before it can show anything (JS + CSS). */
  firstVisit: 230,
  /** Any single file loaded later, e.g. one page's code. */
  lazyFile: 25,
}

const kb = (bytes) => bytes / 1024
const gz = (file) => gzipSync(readFileSync(`dist/${file}`)).length

// The first visit is index.html plus every script, preload and stylesheet it links.
const html = readFileSync('dist/index.html', 'utf8')
const initial = new Set(
  [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]),
)
const firstVisit = kb([...initial].reduce((sum, f) => sum + gz(f), 0))

// Everything else in dist/assets is fetched later (lazy pages, fonts aside).
const lazy = readdirSync('dist/assets')
  .map((f) => `assets/${f}`)
  .filter((f) => f.endsWith('.js') && !initial.has(f))
  .map((f) => ({ file: f, size: kb(gz(f)) }))
  .sort((a, b) => b.size - a.size)

let failed = false
const report = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failed = true
}
report(
  firstVisit <= BUDGET.firstVisit,
  `first visit: ${firstVisit.toFixed(1)} kB of ${BUDGET.firstVisit} kB (${initial.size} files)`,
)
// Every later file must fit the per-file limit (largest first, so the report starts with it).
for (const { file, size } of lazy) {
  report(
    size <= BUDGET.lazyFile,
    `later file ${file}: ${size.toFixed(1)} kB of ${BUDGET.lazyFile} kB`,
  )
}
process.exit(failed ? 1 : 0)
