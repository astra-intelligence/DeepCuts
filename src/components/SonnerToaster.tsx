// Sonner's toast area, styled and placed for the app. Loaded on demand through <AppToaster /> so
// Sonner stays out of the first visit's bundle (see src/notify.ts).
import { Toaster } from 'sonner'
// Sonner's own stylesheet, bundled with the app's CSS. Sonner also tries to add these styles as an
// inline <style> tag, which the CSP blocks (style-src 'self', ADR-0008); this copy is what applies.
import 'sonner/dist/styles.css'

/**
 * The toast area: top right, dark to match the app. Styling is Sonner's default for now.
 * Sonner's own z-index (999999999) already sits above every layer in the app (highest: z-50).
 */
export function SonnerToaster() {
  return <Toaster position="top-right" theme="dark" closeButton />
}
