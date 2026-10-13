// Sonner's toast area, styled and placed for the app. Loaded on demand through <AppToaster /> so
// Sonner stays out of the first visit's bundle (see src/notify.ts).
import { Toaster } from 'sonner'
// Sonner's own stylesheet, bundled with the app's CSS. Sonner also tries to add these styles as an
// inline <style> tag, which the CSP blocks (style-src 'self', ADR-0008); this copy is what applies.
import 'sonner/dist/styles.css'
import { HEADER_HEIGHT_VAR } from '../hooks/useHeaderHeight'

// Just below the page's header (its height comes from useHeaderHeight), with a small gap. On a
// page without a header the variable is unset, so toasts sit near the top of the window.
// Sonner applies this as a CSS variable through React's style prop, which the CSP allows.
const BELOW_HEADER = { top: `calc(var(${HEADER_HEIGHT_VAR}, 0px) + 12px)` }

/**
 * The toast area: centered just below the header, at every screen size (owner, 2026-10-13); on
 * phones Sonner makes toasts full width with a 16px margin. Dark to match the app, otherwise
 * Sonner's default styling for now. Sonner's own z-index (999999999) already sits above every
 * layer in the app (highest: z-50).
 */
export function SonnerToaster() {
  return (
    <Toaster
      position="top-center"
      offset={BELOW_HEADER}
      mobileOffset={BELOW_HEADER}
      theme="dark"
      closeButton
    />
  )
}
