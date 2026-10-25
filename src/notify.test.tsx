// Tests for withToast: one toast for how an action went, including an action that throws before
// it returns a promise (e.g. no clipboard outside a secure context).
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppToaster } from './components/layout/AppToaster'
import { withToast } from './notify'
import { findToast } from './test/renderRoute'

const messages = { success: 'It worked.', error: 'It didn’t work.' }

describe('withToast', () => {
  it('confirms an action that worked', async () => {
    render(<AppToaster />)
    expect(await withToast(() => Promise.resolve(), messages)).toBe(true)
    expect(await findToast('It worked.')).toBeInTheDocument()
  })

  it('reports an action that failed', async () => {
    render(<AppToaster />)
    expect(await withToast(() => Promise.reject(new Error('offline')), messages)).toBe(false)
    expect(await findToast('It didn’t work.')).toBeInTheDocument()
  })

  it('reports an action that throws before returning a promise', async () => {
    render(<AppToaster />)
    const action = () => {
      throw new Error('no clipboard')
    }
    expect(await withToast(action, messages)).toBe(false)
    expect(await findToast('It didn’t work.')).toBeInTheDocument()
  })
})
