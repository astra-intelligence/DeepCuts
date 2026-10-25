// Where the app's toasts appear (src/notify.ts). Mounted once, outside the router (main.tsx), so a
// toast survives route changes: "Signed in as Mike." shows on the page sign-in returns to.
import { lazy, Suspense } from 'react'

// Sonner and its styles load after the first render, keeping them out of the first visit's
// bundle. A toast raised before then is kept by Sonner and shown once this has loaded.
const SonnerToaster = lazy(() =>
  import('./SonnerToaster').then((m) => ({ default: m.SonnerToaster })),
)

/** The app's toast area (top right), loaded on demand. */
export function AppToaster() {
  return (
    <Suspense>
      <SonnerToaster />
    </Suspense>
  )
}
