// Every semantic color token must be exposed as a Tailwind utility (ADR-0006), otherwise
// classes like `border-border-control` silently do nothing.
import { readFileSync } from 'node:fs'

const tokens = [
  ...readFileSync('src/styles/tokens.css', 'utf8').matchAll(
    /--(dc-color-(?:surface|text|accent|border|focus|tag|genre)[\w-]*):/g,
  ),
].map((m) => m[1])
const theme = readFileSync('src/index.css', 'utf8')
const missing = tokens.filter((t) => !theme.includes(`var(--${t})`))
if (missing.length) {
  console.error(`✗ semantic tokens without a Tailwind utility: ${missing.join(', ')}`)
  process.exit(1)
}
console.log(`✓ all ${tokens.length} semantic color tokens are mapped in @theme`)
