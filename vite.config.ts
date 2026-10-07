/// <reference types="vitest/config" />
// Vite configuration: the dev server, the production build, the local TMDB proxy, security
// headers, and the unit-test runner (Vitest reads its settings from `test` below).
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { tmdbProxy } from './server/tmdbProxy.ts'

// Security headers (ADR-0008). CSP is applied to `vite preview` (the production build);
// the dev server needs inline scripts for React Fast Refresh, so it gets the other headers only.
// HSTS is omitted because localhost is plain HTTP; it belongs on the post-MVP host.
const baseHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=(), payment=()',
  'X-Frame-Options': 'DENY',
}

// Content-Security-Policy: the browser may only load scripts, styles and fonts from this app,
// images from this app or TMDB's image host, and may not be framed by other sites.
// Exported so the E2E security test checks the exact same policy.
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://image.tmdb.org",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export default defineConfig(({ mode }) => ({
  // TMDB_READ_TOKEN is read without the VITE_ prefix, so it never reaches the bundle (ADR-0013).
  plugins: [react(), tailwindcss(), tmdbProxy(loadEnv(mode, process.cwd(), '').TMDB_READ_TOKEN)],
  server: { headers: baseHeaders },
  preview: { headers: { ...baseHeaders, 'Content-Security-Policy': contentSecurityPolicy } },
  // Fonts are never inlined as data: URIs, which the CSP's font-src 'self' would block.
  // No source maps in the production build, so the original source isn't published.
  build: {
    sourcemap: false,
    assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
  // Unit tests (Vitest): a simulated browser (jsdom), shared setup, and which files are tests.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    // Tests check behavior, not styles, so CSS isn't processed (faster).
    css: false,
    // Newer Node versions ship a global localStorage that shadows jsdom's and is unusable without
    // a file; the flag turns it off (harmless where it's already off).
    execArgv: ['--no-experimental-webstorage'],
    // `npm run coverage` fails if tests cover less than these minimums.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.contract.ts',
        'src/test/**',
        'server/**/*.test.ts',
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
