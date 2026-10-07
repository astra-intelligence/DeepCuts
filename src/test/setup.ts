import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { createLocalTagRepository } from '../adapters/local/LocalTagRepository'
import { createMockSessionProvider } from '../adapters/local/MockSessionProvider'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(async () => {
  cleanup()
  server.resetHandlers()
  // Saved profiles and tags must not leak between tests (reset through the adapters, ADR-0013).
  // Server tests run in plain Node, which has no browser storage.
  if (typeof window === 'undefined') return
  await createMockSessionProvider().signOut()
  await createLocalTagRepository().clear()
})
afterAll(() => server.close())
