// @vitest-environment node
// The accounts tests route requests through a table (server/testing/api.ts) that mirrors the
// Pages files under functions/api/. This checks every listed file exists and serves the methods
// the table says, so the tests can't silently drift from what Cloudflare actually runs.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROUTES } from './testing/api'

describe('accounts API routes', () => {
  it.each(Object.entries(ROUTES))('%s is served by its Pages file', (_path, [file]) => {
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(file, 'utf8')).toContain('route<AccountsEnv>(')
  })
})
