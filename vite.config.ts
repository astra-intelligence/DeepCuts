/// <reference types="vitest/config" />
// Vite configuration: the dev server, the production build, the local TMDB proxy, security
// headers, and the unit-test runner (Vitest reads its settings from `test` below).
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
import { baseHeaders, contentSecurityPolicy } from './server/securityHeaders.ts'
import { tmdbProxy } from './server/tmdbProxy.ts'

// Security headers (ADR-0008), defined once in server/securityHeaders.ts. CSP is applied to
// `vite preview` (the production build); the dev server needs inline scripts for React Fast
// Refresh, so it gets the other headers only. HSTS is for the hosted app only (localhost is HTTP).
// Re-exported so the E2E security test checks the exact same values.
export { baseHeaders, contentSecurityPolicy }

export default defineConfig(({ mode }) => ({
  // TMDB_READ_TOKEN is read without the VITE_ prefix, so it never reaches the bundle (ADR-0013).
  plugins: [
    react(),
    tailwindcss(),
    tmdbProxy(loadEnv(mode, process.cwd(), '').TMDB_READ_TOKEN),
    // `npm run analyze` only: a treemap of what's in the bundle, at build/bundle-report.html.
    mode === 'analyze' &&
      visualizer({ filename: 'build/bundle-report.html', gzipSize: true, template: 'treemap' }),
  ],
  server: { headers: baseHeaders },
  preview: { headers: { ...baseHeaders, 'Content-Security-Policy': contentSecurityPolicy } },
  // Fonts are never inlined as data: URIs, which the CSP's font-src 'self' would block.
  // No source maps in the production build, so the original source isn't published.
  build: {
    sourcemap: false,
    assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
    // Libraries go into three stable files that only change when a library is upgraded, so a
    // returning visitor keeps them cached across app updates. Pages are split by the router.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            {
              name: 'react-aria',
              test: /node_modules[\\/](react-aria|react-aria-components|react-stately|@react-aria|@react-stately|@react-types|@internationalized|@swc)[\\/]/,
            },
            { name: 'data', test: /node_modules[\\/](zod|@tanstack)[\\/]/ },
          ],
        },
      },
    },
  },
  // Unit tests (Vitest): a simulated browser (jsdom), shared setup, and which files are tests.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    // Screen tests drive a whole page through user events; under coverage on a busy machine a few
    // took 5–7 s (Vitest's default limit is 5 s). 15 s still catches a real hang.
    testTimeout: 15_000,
    // Tests check behavior, not styles, so CSS isn't processed (faster).
    css: false,
    // Newer Node versions ship a global localStorage that shadows jsdom's and is unusable without
    // a file; the flag turns it off (harmless where it's already off).
    execArgv: ['--no-experimental-webstorage'],
    // `npm run coverage` fails if tests cover less than these minimums.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'functions/**/*.ts'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.contract.ts',
        'src/test/**',
        // Storybook stories are documentation, checked by the Storybook a11y gate instead.
        'src/**/*.stories.tsx',
        'server/**/*.test.ts',
        'server/**/*.contract.ts',
      ],
      thresholds: {
        lines: 80,
        // Tag rules carry the product's invariants (ADR-0010, ADR-0017).
        'src/domain/tagRules.ts': { lines: 100, branches: 100, functions: 100, statements: 100 },
        // The recommendation scorer (ADR-0010, ADR-0026).
        'src/domain/scorer.ts': { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  },
}))
