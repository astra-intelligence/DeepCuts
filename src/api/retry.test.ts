// Tests for the retry rule: one retry for ordinary failures, none for a rate-limit 429.
import { describe, expect, it } from 'vitest'
import { TagApiError } from '@/adapters/cloudflare/CloudflareTagRepository'
import { shouldRetry } from './retry'
import { TmdbError } from './tmdb'

describe('shouldRetry', () => {
  it('retries an ordinary failure once', () => {
    expect(shouldRetry(0, new TmdbError(502))).toBe(true)
    expect(shouldRetry(1, new TmdbError(502))).toBe(false)
  })

  it('retries a network error (no status) once', () => {
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(false)
  })

  it('never retries a 429, from either API', () => {
    expect(shouldRetry(0, new TmdbError(429))).toBe(false)
    expect(shouldRetry(0, new TagApiError(429))).toBe(false)
  })

  it('copes with errors that are not objects', () => {
    expect(shouldRetry(0, null)).toBe(true)
    expect(shouldRetry(0, 'boom')).toBe(true)
  })
})
