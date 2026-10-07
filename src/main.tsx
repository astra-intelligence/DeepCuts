// The app's entry point: sets up data caching, the session and the router, then renders.
// index.html loads this file.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createMockSessionProvider } from './adapters/local/MockSessionProvider'
import { AppSessionProvider } from './session/AppSessionProvider'
import { routes } from './router'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

// Shared cache for every data request. Retry a failed request once; don't re-fetch just because
// the window regained focus (movie data rarely changes).
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})
const router = createBrowserRouter(routes)
// Read the saved session before the first render, so the app never flashes a guest state for
// someone who is signed in.
const sessionProvider = createMockSessionProvider()
const initialSession = await sessionProvider.getSession()

// StrictMode runs extra checks in development only (e.g. effects run twice to expose bugs).
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppSessionProvider provider={sessionProvider} initialSession={initialSession}>
        <RouterProvider router={router} />
      </AppSessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
