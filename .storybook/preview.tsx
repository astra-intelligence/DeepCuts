// Wraps every story in what the app's components expect: the global stylesheet (fonts, tokens,
// base styles), a data cache, a session and a router. Stories pick a session with
// `parameters.session`, e.g. a signed-in account.
import type { Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { Session } from '../src/adapters/SessionProvider'
import { AppSessionProvider } from '../src/session/AppSessionProvider'
import '../src/index.css'

const preview: Preview = {
  decorators: [
    (Story, { parameters }) => (
      // A fresh cache per story, so one story's data never leaks into another.
      <QueryClientProvider client={new QueryClient()}>
        <AppSessionProvider initialSession={(parameters.session as Session) ?? { kind: 'guest' }}>
          <MemoryRouter>
            {/* Page-like padding on the app's dark surface. */}
            <div className="min-h-dvh bg-surface p-6 text-fg">
              <Story />
            </div>
          </MemoryRouter>
        </AppSessionProvider>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    // Fail the a11y panel's checks on any violation, matching the CI gate.
    a11y: { test: 'error' },
  },
}

export default preview
