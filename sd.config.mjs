// Builds design tokens (DTCG, tokens/*.json) into CSS variables + a flat JSON used by checks. ADR-0006.
import StyleDictionary from 'style-dictionary'

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
  },
})

await sd.buildAllPlatforms()
