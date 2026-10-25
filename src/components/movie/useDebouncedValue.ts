// Debouncing: wait for a value to stop changing before acting on it.
import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it has stayed the same for `delayMs`. Used so search runs once
 * typing pauses, not on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    // Each change restarts the timer; only a pause long enough lets it fire.
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
