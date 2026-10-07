// @vitest-environment node
// Tests that the generated `_headers` file (Stage 4 H6) carries exactly the exported security
// headers, so hosted static files get the same policy `vite preview` and the E2E tests use.
import { describe, expect, it } from 'vitest'
import {
  baseHeaders,
  contentSecurityPolicy,
  headersFile,
  productionHeaders,
  strictTransportSecurity,
} from './securityHeaders'

// Parses a `_headers` file into { path: { header: value } }.
function parse(text: string) {
  const rules: Record<string, Record<string, string>> = {}
  let path = ''
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    if (!line.startsWith(' ')) rules[(path = line)] = {}
    else {
      const i = line.indexOf(':')
      rules[path][line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
  return rules
}

describe('_headers (Stage 4 H6)', () => {
  const rules = parse(headersFile())

  it('sends every production header on every path', () => {
    expect(rules['/*']).toEqual(productionHeaders)
    expect(rules['/*']).toMatchObject(baseHeaders)
    expect(rules['/*']['Content-Security-Policy']).toBe(contentSecurityPolicy)
  })

  it('adds HSTS without preload', () => {
    expect(rules['/*']['Strict-Transport-Security']).toBe(strictTransportSecurity)
    expect(strictTransportSecurity).not.toContain('preload')
  })

  it('caches hashed assets for a year', () => {
    expect(rules['/assets/*']).toEqual({ 'Cache-Control': 'public, max-age=31536000, immutable' })
  })
})
