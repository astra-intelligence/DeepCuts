import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

function focusHeading(h1: HTMLElement) {
  h1.tabIndex = -1
  h1.focus()
}

/**
 * Moves focus to the page's <h1> after client-side navigation so screen-reader and keyboard
 * users land on the new content (WCAG 2.4.3). Waits briefly for pages that load data first.
 * Skipped on the first render.
 */
export function useRouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
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
