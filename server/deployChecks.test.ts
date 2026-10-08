// @vitest-environment node
// Tests for the deploy pre-flight (server/deployChecks.ts): only reviewed, merged main with a real
// database id may go live.
import { describe, expect, it } from 'vitest'
import { deployProblems, PLACEHOLDER_DATABASE_ID, type GitState } from './deployChecks'

const clean: GitState = { branch: 'main', status: '', head: 'abc123', originMain: 'abc123' }
const config = 'database_id = "5f0c2a8e-1111-4222-8333-944455556666"'

describe('deployProblems', () => {
  it('lets clean, up-to-date main with a real database id through', () => {
    expect(deployProblems(clean, config)).toEqual([])
  })

  it('refuses another branch, or a detached HEAD', () => {
    expect(deployProblems({ ...clean, branch: 'feat/x' }, config)[0]).toMatch(/"feat\/x"/)
    expect(deployProblems({ ...clean, branch: '' }, config)[0]).toMatch(/detached HEAD/)
  })

  it('refuses uncommitted changes', () => {
    expect(deployProblems({ ...clean, status: ' M src/main.tsx\n' }, config)).toHaveLength(1)
  })

  it("refuses a main that differs from GitHub's", () => {
    expect(deployProblems({ ...clean, originMain: 'def456' }, config)[0]).toMatch(/git pull/)
  })

  it('refuses the placeholder database id', () => {
    const toml = `database_id = "${PLACEHOLDER_DATABASE_ID}"`
    expect(deployProblems(clean, toml)[0]).toMatch(/placeholder D1 database_id/)
  })

  it('lists every problem at once', () => {
    const git = { branch: 'x', status: '?? a', head: '1', originMain: '2' }
    expect(deployProblems(git, PLACEHOLDER_DATABASE_ID)).toHaveLength(4)
  })
})
