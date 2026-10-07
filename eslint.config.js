// ESLint configuration (`npm run lint`): code-quality, React and accessibility rules, plus
// project rules that enforce security ADRs.
import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Shown when code outside the storage adapters touches browser storage.
const storageMsg = 'Browser storage is only allowed in src/adapters/local/ (ADR-0013).'

export default defineConfig([
  globalIgnores(['dist', 'build', 'coverage', 'storybook-static']),
  // All TypeScript: recommended JS rules, strict TypeScript rules, React hooks rules, fast-refresh
  // safety, and strict accessibility (jsx-a11y).
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.strict,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // Browser storage only through src/adapters/local/ (ADR-0013).
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: storageMsg },
        { name: 'sessionStorage', message: storageMsg },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: storageMsg },
        { object: 'window', property: 'sessionStorage', message: storageMsg },
        { object: 'globalThis', property: 'localStorage', message: storageMsg },
      ],
      // Raw HTML injection is an XSS risk (ADR-0008).
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned (ADR-0008).',
        },
      ],
    },
  },
  {
    // Playwright fixtures call `use()`, which is not a React hook.
    files: ['e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  // The one place allowed to use browser storage.
  {
    files: ['src/adapters/local/**'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
  // Build scripts and config files run in Node, not the browser.
  {
    files: ['scripts/**/*.mjs', '*.config.{js,mjs,ts}', 'sd.config.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
