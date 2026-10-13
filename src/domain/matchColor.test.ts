// The match sticker's text must read on its fill at every match from 0 to 100. This reproduces the
// browser's `color-mix(in oklch, high p%, low)` from the token values (shorter hue arc, then
// clipped to sRGB), and checks the chosen text color against it: 3:1 for the 24px number (WCAG
// large text), and that the choice is the better of ink and bone.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INK_FROM, inkOnMatch, matchBlend } from './matchColor'

const tokens = JSON.parse(readFileSync('build/tokens/tokens.json', 'utf8')) as Record<
  string,
  string
>
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

// sRGB ↔ OKLab (Björn Ottosson's matrices).
function toOklab(hex: string) {
  const [r = 0, g = 0, b = 0] = channels(hex).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ] as const
}
function fromOklab(L: number, a: number, b: number) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, toGamma(c))))
}
// color-mix(in oklch, high t, low): lightness, chroma and hue (the shorter way round) blend.
function mix(low: string, high: string, t: number) {
  const lch = (hex: string) => {
    const [L, a, b] = toOklab(hex)
    return [L, Math.hypot(a, b), Math.atan2(b, a)] as const
  }
  const [L1, C1, h1] = lch(low)
  const [L2, C2, h2] = lch(high)
  let dh = h2 - h1
  if (dh > Math.PI) dh -= 2 * Math.PI
  if (dh < -Math.PI) dh += 2 * Math.PI
  const L = L1 + (L2 - L1) * t
  const C = C1 + (C2 - C1) * t
  const h = h1 + dh * t
  return fromOklab(L, C * Math.cos(h), C * Math.sin(h))
}
const luminance = (c: number[]) => {
  const [r = 0, g = 0, b = 0] = c.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (x: number[], y: number[]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((a, b) => b - a)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

describe('match sticker colors', () => {
  const low = tokens['color-match-low'] ?? ''
  const high = tokens['color-match-high'] ?? ''
  const ink = channels(tokens['color-fg-on-accent'] ?? '')
  const bone = channels(tokens['color-fg-on-danger'] ?? '')

  it('blends by the match, clamped to 0-100', () => {
    expect(matchBlend(57)).toEqual({ '--match': '57%' })
    expect(matchBlend(-5)).toEqual({ '--match': '0%' })
    expect(matchBlend(140)).toEqual({ '--match': '100%' })
  })

  it('prints the number in whichever of ink and bone reads better, at 3:1 or more, for every match', () => {
    for (let p = 0; p <= 100; p++) {
      const fill = mix(low, high, p / 100)
      const onInk = contrast(ink, fill)
      const onBone = contrast(bone, fill)
      const chosen = inkOnMatch(p) ? onInk : onBone
      expect(chosen, `${p}%`).toBeGreaterThanOrEqual(3)
      expect(chosen, `${p}%: the other text color reads better`).toBeGreaterThanOrEqual(
        Math.min(onInk, onBone),
      )
    }
    expect(INK_FROM).toBeGreaterThan(0)
  })
})
