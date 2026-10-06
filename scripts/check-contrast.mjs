// Fails if any semantic fg/bg token pair is below its WCAG contrast minimum. ADR-0006, ADR-0009.
import { readFileSync } from 'node:fs'

const tokens = JSON.parse(readFileSync('build/tokens/tokens.json', 'utf8'))
const pairs = JSON.parse(readFileSync('scripts/contrast-pairs.json', 'utf8'))

const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = (hex) => {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

let failed = 0
for (const [fg, bg, min] of pairs) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`✗ unknown token in pair: ${fg} / ${bg}`)
    failed++
    continue
  }
  const r = ratio(tokens[fg], tokens[bg])
  const ok = r >= min
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`)
}
process.exit(failed ? 1 : 0)
