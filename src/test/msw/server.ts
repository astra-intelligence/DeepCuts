// The fake TMDB server for unit tests; setup.ts starts and resets it.
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
