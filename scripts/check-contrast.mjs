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

/** `a` and `b` mixed in sRGB with `weight` of `a`, as CSS `color-mix(in srgb, a w%, b)` does. */
const mix = (a, weight, b) =>
  '#' +
  [0, 2, 4]
    .map((i) => {
      const [x, y] = [a, b].map((h) => parseInt(h.replace('#', '').slice(i, i + 2), 16))
      return Math.round(x * weight + y * (1 - weight))
        .toString(16)
        .padStart(2, '0')
    })
    .join('')

/**
 * A pair side is a token name, or `{ "mix": [token, weight, token] }` for a color the page mixes
 * at runtime (e.g. the genre sticker's face, index.css `sticker-face`). Returns [label, hex].
 */
const resolve = (side) => {
  if (typeof side === 'string') return [side, tokens[side]]
  const [a, weight, b] = side.mix
  const label = `mix(${a} ${weight * 100}%, ${b})`
  return [label, tokens[a] && tokens[b] ? mix(tokens[a], weight, tokens[b]) : undefined]
}

let failed = 0
for (const [fgSide, bgSide, min] of pairs) {
  const [fg, fgHex] = resolve(fgSide)
  const [bg, bgHex] = resolve(bgSide)
  if (!fgHex || !bgHex) {
    console.error(`✗ unknown token in pair: ${fg} / ${bg}`)
    failed++
    continue
  }
  const r = ratio(fgHex, bgHex)
  const ok = r >= min
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`)
}
process.exit(failed ? 1 : 0)
