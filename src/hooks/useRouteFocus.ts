import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * Moves focus to the page's <h1> after client-side navigation so screen-reader and keyboard
 * users land on the new content (WCAG 2.4.3). Skipped on the first render.
 */
export function useRouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const h1 = document.querySelector<HTMLElement>('main h1')
    if (!h1) return
    h1.tabIndex = -1
    h1.focus({ preventScroll: false })
  }, [pathname])
}
