// Tests for useHeaderHeight: the header's height is published as --header-height while the header
// is on the page, and removed with it.
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HEADER_HEIGHT_VAR, useHeaderHeight } from './useHeaderHeight'

function Page() {
  const header = useRef<HTMLElement>(null)
  useHeaderHeight(header)
  return <header ref={header}>Deep Cuts</header>
}

const published = () => document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR)

describe('useHeaderHeight', () => {
  it('publishes the header height, and removes it when the header leaves', () => {
    // jsdom doesn't lay out, so give the header a height.
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ height: 72 } as DOMRect)
    try {
      const { unmount } = render(<Page />)
      expect(published()).toBe('72px')
      unmount()
      expect(published()).toBe('')
    } finally {
      rect.mockRestore()
    }
  })
})
