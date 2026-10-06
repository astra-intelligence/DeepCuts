// Builds design tokens (DTCG, tokens/**/*.json) into every output (ADR-0006, ADR-0023):
// CSS variables (web), a flat JSON (checks), a typed ES module (SVG/canvas, React Native) and
// DTCG 2025.10 JSON that Figma imports as variables.
import StyleDictionary from 'style-dictionary'

// DTCG 2025.10 colors are objects, not hex strings. Aliases ("{color.teal.400}") are kept so
// Figma variables reference each other the same way the source tokens do.
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
      node[token.path.at(-1)] = {
        $type: token.$type,
        $value: typeof raw === 'string' && raw.startsWith('{') ? raw : toDtcgColor(token.$value),
        ...(token.$description && { $description: token.$description }),
      }
    }
    return JSON.stringify(root, null, 2) + '\n'
  },
})

const sd = new StyleDictionary({
  source: ['tokens/**/*.json'],
  log: { verbosity: 'silent' },
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'dc',
      buildPath: 'src/styles/',
      files: [
        { destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } },
      ],
    },
    json: {
      transformGroup: 'css',
      buildPath: 'build/tokens/',
      files: [{ destination: 'tokens.json', format: 'json/flat' }],
    },
    js: {
      transformGroup: 'js',
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
