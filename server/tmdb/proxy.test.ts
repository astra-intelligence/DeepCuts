// @vitest-environment node
// Tests for the local TMDB proxy (the Vite middleware adapter): it passes the shared proxy
// contract, and leaves every non-proxy request to the next middleware.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { tmdbProxyContract } from './proxy.contract'
import { createTmdbMiddleware } from './proxy'

// Runs one request through the middleware with a minimal fake Node response.
async function viaMiddleware(
  url: string,
  { method, token, fetchImpl }: { method: string; token?: string; fetchImpl?: typeof fetch },
) {
  const res = { status: 0, headers: {} as Record<string, string>, body: '' }
  const response = {
    set statusCode(v: number) {
      res.status = v
    },
    setHeader: (k: string, v: string) => {
      res.headers[k.toLowerCase()] = v
    },
    end: (b: string) => {
      res.body = b
    },
  } as unknown as ServerResponse
  const next = vi.fn()
  await createTmdbMiddleware(token, fetchImpl)({ url, method } as IncomingMessage, response, next)
  return { ...res, next }
}

tmdbProxyContract('Vite middleware', viaMiddleware)

describe('TMDB proxy middleware', () => {
  it('passes through non-proxy requests', async () => {
    const res = await viaMiddleware('/src/main.tsx', { method: 'GET', token: 'x' })
    expect(res.next).toHaveBeenCalled()
  })
})
