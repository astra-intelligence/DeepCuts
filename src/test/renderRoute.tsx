// Test helper: renders the real app at a URL, with its own fresh data cache, so a test can
// navigate and click like a person would. Options swap in feature flags or a custom session.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Session, SessionProvider } from '../adapters/SessionProvider'
import { AppSessionProvider } from '../session/AppSessionProvider'
import { FEATURES, type Features } from '../config/features'
import { createRoutes } from '../router'

interface Options {
  features?: Partial<Features>
  /** A custom session adapter, e.g. one whose sign-in fails. */
  sessionProvider?: SessionProvider
  initialSession?: Session
}

export function renderRoute(path: string, options: Options = {}) {
  const routes = createRoutes({ ...FEATURES, ...options.features })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AppSessionProvider
          {...(options.sessionProvider && { provider: options.sessionProvider })}
          {...(options.initialSession && { initialSession: options.initialSession })}
        >
          <RouterProvider router={router} />
        </AppSessionProvider>
      </QueryClientProvider>,
    ),
  }
}
