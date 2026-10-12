// Runs before every unit test file (vite.config.ts → test.setupFiles).
// Adds DOM matchers (toBeInTheDocument…), starts the fake TMDB server, and resets state between
// tests so they can't affect each other.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { createLocalTagRepository } from '../adapters/local/LocalTagRepository'
import { createMockSessionProvider } from '../adapters/local/MockSessionProvider'
import { server } from './msw/server'

// findBy*/waitFor wait up to 3s instead of 1s. The first test in a file also loads its lazy page
// (route code splitting) and the fake TMDB answer; under coverage, with files running in
// parallel, that sometimes took over a second and failed a correct test.
configure({ asyncUtilTimeout: 3000 })

// Any request without a fake handler fails the test, so tests can never reach the real TMDB.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  // Accounts and their tags must not leak between tests (reset through the adapters, ADR-0013).
  // Server tests run in plain Node, which has no browser storage.
  if (typeof window === 'undefined') return
  await createMockSessionProvider().signOut()
  await createLocalTagRepository(undefined, undefined, 'account-demo-tags').clear()
})
afterAll(() => server.close())
