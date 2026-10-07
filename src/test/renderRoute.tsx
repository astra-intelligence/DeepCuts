import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppSessionProvider } from '../session/AppSessionProvider'
import { FEATURES, type Features } from '../config/features'
import { createRoutes } from '../router'

export function renderRoute(path: string, options: { features?: Partial<Features> } = {}) {
  const routes = createRoutes({ ...FEATURES, ...options.features })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AppSessionProvider>
          <RouterProvider router={router} />
        </AppSessionProvider>
      </QueryClientProvider>,
    ),
  }
}
