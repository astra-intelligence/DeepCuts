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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})
const router = createBrowserRouter(routes)
const sessionProvider = createMockSessionProvider()
const initialSession = await sessionProvider.getSession()

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppSessionProvider provider={sessionProvider} initialSession={initialSession}>
        <RouterProvider router={router} />
      </AppSessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
