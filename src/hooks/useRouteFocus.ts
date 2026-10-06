import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

function focusHeading(h1: HTMLElement) {
  h1.tabIndex = -1
  h1.focus()
}

/**
 * Moves focus to the page's <h1> after client-side navigation so screen-reader and keyboard
 * users land on the new content (WCAG 2.4.3). Waits briefly for pages that load data first.
 * Skipped on the initial page load (the router's first history entry has the key "default").
 * A layout that mounts after a navigation still moves focus. Only page changes count: search
 * param updates (typing on /search) never steal focus.
 */
export function useRouteFocus() {
  const { pathname, key } = useLocation()
  // Remember which page was the initial load. Comparing paths (not a one-shot flag) keeps
  // this correct when React StrictMode runs the effect twice in development.
  const initialPath = useRef(key === 'default' ? pathname : null)
  useEffect(() => {
    if (pathname === initialPath.current) return
    initialPath.current = null
    const main = document.getElementById('main')
    const existing = main?.querySelector<HTMLElement>('h1')
    if (!main || existing) {
      if (existing) focusHeading(existing)
      return
    }
    const observer = new MutationObserver(() => {
      const h1 = main.querySelector<HTMLElement>('h1')
      if (h1) {
        observer.disconnect()
        focusHeading(h1)
      }
    })
    observer.observe(main, { childList: true, subtree: true })
    const timeout = setTimeout(() => observer.disconnect(), 3000)
    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [pathname])
}
