// Publishes a page header's height as the CSS variable `--header-height` on <html>, so things that
// float over the page can sit just below the header. Used by the toasts (SonnerToaster.tsx).
//
// The headers change height: the app header wraps the search onto its own row on phones, and the
// safe-area inset adds to it on notched phones. A ResizeObserver keeps the variable current.
import { useEffect, type RefObject } from 'react'

/** The CSS variable this hook sets; unset (no header on the page) means 0. */
export const HEADER_HEIGHT_VAR = '--header-height'

/**
 * Keeps `--header-height` equal to this header's height while it's on the page.
 * @param ref - The page's header. It must sit at the top of the page (all of ours do).
 */
export function useHeaderHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const header = ref.current
    if (!header) return
    const root = document.documentElement
    const publish = () =>
      root.style.setProperty(HEADER_HEIGHT_VAR, `${header.getBoundingClientRect().height}px`)
    publish()
    // jsdom (unit tests) has no ResizeObserver; the first measurement is enough there.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    observer?.observe(header)
    return () => {
      observer?.disconnect()
      // React runs this before the next page's header publishes its own height, so a layout
      // change never leaves the old value behind.
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [ref])
}
