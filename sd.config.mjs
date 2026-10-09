// Builds design tokens (DTCG 2025.10, tokens/**/*.json) into every output (ADR-0006, ADR-0023,
// ADR-0027):
// - CSS variables: tokens.css (tiers 1–3) and theme-dark.css (the theme layer, tier 2 colors)
// - theme.css: the Tailwind theme, GENERATED from the tokens so class names always match token
//   names (`color.fg.muted` → `text-fg-muted`, `radius.card` → `rounded-card`)
// - a flat JSON (checks), a typed ES module (SVG/canvas, React Native) and DTCG JSON for Figma
import StyleDictionary from 'style-dictionary'

/** Tiers by source folder (ADR-0027). */
const tierOf = (token) => token.filePath.split('/')[1]
const isTheme = (token) => tierOf(token) === 'themes'

// ---- Values: DTCG objects → CSS strings ------------------------------------------------------
const withUnit = (v) => (typeof v === 'object' && v !== null ? `${v.value}${v.unit}` : `${v}`)
const toHex = (c) =>
  '#' +
  c.components
    .map((x) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
const cssColor = (c) => {
  if (typeof c === 'string') return c
  if (c.alpha === undefined || c.alpha === 1) return c.hex ?? toHex(c)
  return `rgb(${c.components.map((x) => Math.round(x * 255)).join(' ')} / ${c.alpha})`
}
const quoteFamily = (f) => (/\s/.test(f) ? `'${f}'` : f)
const cssValue = (type, v) => {
  switch (type) {
    case 'dimension':
    case 'duration':
      return withUnit(v)
    case 'color':
      return cssColor(v)
    case 'fontFamily':
      // A string with commas is a stack that was already written out (aliases resolve twice).
      return Array.isArray(v) ? v.map(quoteFamily).join(', ') : v.includes(',') ? v : quoteFamily(v)
    case 'cubicBezier':
      return `cubic-bezier(${v.join(', ')})`
    case 'shadow':
      return (Array.isArray(v) ? v : [v])
        .map(
          (s) =>
            [s.offsetX, s.offsetY, s.blur, s.spread].map(withUnit).join(' ') +
            ` ${cssColor(s.color)}`,
        )
        .join(', ')
    default:
      return v
  }
}

StyleDictionary.registerTransform({
  name: 'dc/value/css',
  type: 'value',
  transitive: true,
  filter: (token) => typeof token.$value !== 'string' || token.$type === 'fontFamily',
  transform: (token) => cssValue(token.$type, token.$value),
})

// ---- Tailwind theme (generated) ---------------------------------------------------------------
/** Tailwind key for a token: its path joined with dashes, minus a leading namespace and a
 *  trailing `default` (`color.surface.default` → `surface`). */
const twName = (path) => (path.at(-1) === 'default' ? path.slice(0, -1) : path).join('-')

// Which tokens become which Tailwind namespaces. Colors go through CSS variables so the theme
// layer (and the page accent, ADR-0020) can change them at runtime; everything else is written
// as its value so Tailwind can process it (e.g. `shadow-surface/80` recolors a shadow).
const NAMESPACES = [
  // [Tailwind prefix, token path prefix, tiers exposed]
  ['color', ['color'], ['themes', 'component']],
  ['font', ['font', 'family'], ['semantic']],
  ['text', ['font', 'size'], ['primitive']],
  ['font-weight', ['font', 'weight'], ['primitive']],
  ['tracking', ['font', 'tracking'], ['primitive']],
  ['leading', ['font', 'leading'], ['primitive']],
  ['radius', ['radius'], ['primitive', 'semantic', 'component']],
  ['shadow', ['shadow'], ['primitive', 'component']],
  ['shadow', ['elevation'], ['semantic']],
  ['blur', ['blur'], ['primitive']],
  ['breakpoint', ['size', 'breakpoint'], ['primitive']],
  ['container', ['size', 'container'], ['primitive']],
  ['ease', ['easing'], ['primitive']],
]
const startsWith = (path, prefix) => prefix.every((p, i) => path[i] === p)

StyleDictionary.registerFormat({
  name: 'tailwind/theme',
  format: ({ dictionary }) => {
    const byPath = new Map(dictionary.allTokens.map((t) => [t.path.join('.'), t]))
    const value = (path) => byPath.get(path).$value
    const lines = []
    const colorLines = []
    for (const [tw, prefix, tiers] of NAMESPACES) {
      const out = tw === 'color' ? colorLines : lines
      const tokens = dictionary.allTokens.filter(
        (t) =>
          startsWith(t.path, prefix) &&
          tiers.includes(tierOf(t)) &&
          // `rounded-full` is built into Tailwind; leave it alone.
          !(tw === 'radius' && t.path.join('.') === 'radius.full'),
      )
      if (!tokens.length) continue
      out.push('', `  /* ${prefix.join('.')} (${tiers.join(', ')}) */`)
      for (const t of tokens) {
        const name = `--${tw}-${twName(t.path.slice(prefix.length))}`
        out.push(`  ${name}: ${tw === 'color' ? `var(--${t.name})` : t.$value};`)
        if (tw === 'text') {
          // Written as Tailwind does (a unitless ratio) so line boxes round identically.
          const size = t.original.$value.value
          const lineHeight = byPath.get(`font.line-height.${t.path.at(-1)}`).original.$value.value
          const ratio = lineHeight === size ? '1' : `calc(${lineHeight} / ${size})`
          lines.push(`  ${name}--line-height: ${ratio};`)
        }
      }
    }
    return [
      '/* GENERATED by sd.config.mjs from tokens/**. Do not edit; change the tokens instead. */',
      '/* Tailwind’s defaults are replaced by the token values (which are those defaults, ADR-0027). */',
      // `static`: every color variable is emitted, even ones only referenced at runtime
      // (tagColor(), genreTone() build `var(--color-tag-…)` in code, which Tailwind can't see).
      '@theme static inline {',
      '  --color-*: initial;',
      ...colorLines,
      '}',
      '',
      '@theme inline {',
      '  --font-*: initial;',
      '  --text-*: initial;',
      '  --font-weight-*: initial;',
      '  --tracking-*: initial;',
      '  --leading-*: initial;',
      '  --radius-*: initial;',
      '  --shadow-*: initial;',
      '  --blur-*: initial;',
      '  --breakpoint-*: initial;',
      '  --container-*: initial;',
      '  --ease-*: initial;',
      `  --spacing: ${value('space.unit')};`,
      `  --default-font-family: ${value('font.family.body')};`,
      `  --default-transition-duration: ${value('motion.transition.duration')};`,
      `  --default-transition-timing-function: ${value('motion.transition.easing')};`,
      `  --animate-enter: enter ${value('motion.enter.duration')} ${value('motion.enter.easing')} both;`,
      // Motion roles for component stylesheets that animate in plain CSS (VhsBox.css), read
      // with --theme(). Tailwind has no namespace for durations, so they're named for the role.
      `  --motion-turn-duration: ${value('motion.turn.duration')};`,
      `  --motion-turn-easing: ${value('motion.turn.easing')};`,
      ...lines,
      '}',
      '',
    ].join('\n')
  },
})

// ---- Figma: DTCG 2025.10 ---------------------------------------------------------------------
// Colors become objects (2025.10 requires them); aliases are kept so Figma variables reference
// each other the same way the source tokens do. Other values are already DTCG in the source.
const toDtcgColor = (hex) => ({
  colorSpace: 'srgb',
  components: [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4)),
  hex,
})

StyleDictionary.registerFormat({
  name: 'dtcg/2025.10',
  format: ({ dictionary }) => {
    const root = {}
    for (const token of dictionary.allTokens) {
      let node = root
      for (const key of token.path.slice(0, -1)) node = node[key] ??= {}
      const raw = token.original.$value
      const isAlias = typeof raw === 'string' && raw.startsWith('{')
      node[token.path.at(-1)] = {
        $type: token.$type,
        $value:
          isAlias || token.$type !== 'color' || typeof raw !== 'string' ? raw : toDtcgColor(raw),
        ...(token.$description && { $description: token.$description }),
      }
    }
    return JSON.stringify(root, null, 2) + '\n'
  },
})

const css = ['name/kebab', 'dc/value/css']
const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  log: { verbosity: 'silent' },
  platforms: {
    css: {
      transforms: css,
      prefix: 'dc',
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          filter: (t) => !isTheme(t),
          options: { outputReferences: true },
        },
        {
          // The theme layer (Frost's tier 2). A light theme would add theme-light.css under
          // `[data-theme='light']` with the same names.
          destination: 'theme-dark.css',
          format: 'css/variables',
          filter: isTheme,
          options: { outputReferences: true, selector: ":root, [data-theme='dark']" },
        },
      ],
    },
    tailwind: {
      transforms: css,
      prefix: 'dc',
      buildPath: 'src/styles/',
      files: [{ destination: 'theme.css', format: 'tailwind/theme' }],
    },
    json: {
      transforms: css,
      buildPath: 'build/tokens/',
      files: [{ destination: 'tokens.json', format: 'json/flat' }],
    },
    js: {
      transforms: ['name/pascal', 'dc/value/css'],
      buildPath: 'build/tokens/js/',
      files: [
        { destination: 'tokens.js', format: 'javascript/es6' },
        { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
      ],
    },
    figma: {
      transforms: ['name/kebab'],
      buildPath: 'build/figma/',
      files: [{ destination: 'deep-cuts.tokens.json', format: 'dtcg/2025.10' }],
    },
  },
})

await sd.buildAllPlatforms()
