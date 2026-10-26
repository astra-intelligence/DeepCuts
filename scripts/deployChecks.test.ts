// @vitest-environment node
// Tests for the deploy pre-flight (scripts/deployChecks.ts): only reviewed, merged main with a real
// database id and the required Pages secrets may go live.
import { describe, expect, it } from 'vitest'
import {
  deployProblems,
  parseSecretNames,
  PLACEHOLDER_DATABASE_ID,
  type GitState,
} from './deployChecks'

const clean: GitState = { branch: 'main', status: '', head: 'abc123', originMain: 'abc123' }
const config = 'database_id = "5f0c2a8e-1111-4222-8333-944455556666"'
const secrets = ['TMDB_READ_TOKEN', 'CANONICAL_HOST']

describe('deployProblems', () => {
  it('lets clean, up-to-date main with a real database id through', () => {
    expect(deployProblems(clean, config, secrets)).toEqual([])
  })

  it('refuses another branch, or a detached HEAD', () => {
    expect(deployProblems({ ...clean, branch: 'feat/x' }, config, secrets)[0]).toMatch(/"feat\/x"/)
    expect(deployProblems({ ...clean, branch: '' }, config, secrets)[0]).toMatch(/detached HEAD/)
  })

  it('refuses uncommitted changes', () => {
    expect(deployProblems({ ...clean, status: ' M src/main.tsx\n' }, config, secrets)).toHaveLength(
      1,
    )
  })

  it("refuses a main that differs from GitHub's", () => {
    expect(deployProblems({ ...clean, originMain: 'def456' }, config, secrets)[0]).toMatch(
      /git pull/,
    )
  })

  it('refuses the placeholder database id', () => {
    const toml = `database_id = "${PLACEHOLDER_DATABASE_ID}"`
    expect(deployProblems(clean, toml, secrets)[0]).toMatch(/placeholder D1 database_id/)
  })

  it('refuses a missing CANONICAL_HOST secret (ADR-0047)', () => {
    expect(deployProblems(clean, config, ['TMDB_READ_TOKEN'])[0]).toMatch(
      /secret put CANONICAL_HOST/,
    )
  })

  it('lists every problem at once', () => {
    const git = { branch: 'x', status: '?? a', head: '1', originMain: '2' }
    expect(deployProblems(git, PLACEHOLDER_DATABASE_ID, [])).toHaveLength(5)
  })
})

describe('parseSecretNames', () => {
  it('reads the names from wrangler pages secret list', () => {
    const out =
      'The "production" environment of your Pages project "deep-cuts" has access to the following secrets:\n' +
      '  - TMDB_READ_TOKEN: Value Encrypted\n  - CANONICAL_HOST: Value Encrypted\n'
    expect(parseSecretNames(out)).toEqual(['TMDB_READ_TOKEN', 'CANONICAL_HOST'])
  })

  it('finds none in an empty list', () => {
    expect(parseSecretNames('')).toEqual([])
  })
})
