// Media queries in React: re-renders when a CSS media query starts or stops matching.
import { useSyncExternalStore } from 'react'

/** Tailwind's `md` breakpoint (48rem), for layouts that render different markup from tablet up. */
export const MD_UP = '(min-width: 48rem)'

/**
 * Whether `query` matches right now, kept in sync as the window resizes. Use it only when the two
 * layouts need different markup; prefer `md:` classes when CSS alone can do it.
 * Reports false where `matchMedia` is missing (some test environments), so tests see the phone
 * layout unless they stub it.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', onChange)
      return () => list?.removeEventListener('change', onChange)
    },
    () => window.matchMedia?.(query).matches ?? false,
  )
}
