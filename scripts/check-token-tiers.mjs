// Token tiers (ADR-0023): components use semantic tokens through Tailwind utilities only.
// Raw `--dc-*` variables may appear in src/index.css (the @theme mapping), and brand
// variables only in the logo.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED = { 'src/index.css': /--dc-color-/, 'src/components/Logo.tsx': /--dc-brand-/ }
const IGNORE = new Set(['src/styles/tokens.css'])

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(p) ? [p] : []
  })

let problems = 0
for (const file of walk('src')) {
  if (IGNORE.has(file)) continue
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const [, name] of line.matchAll(/(--dc-[\w-]+)/g)) {
        if (ALLOWED[file]?.test(name)) continue
        console.error(`${file}:${i + 1} ${name}: use a semantic Tailwind utility instead`)
        problems++
      }
    })
}
if (!problems) console.log('✓ token tiers respected')
process.exit(problems ? 1 : 0)
