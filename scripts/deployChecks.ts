// The checks `npm run deploy` (scripts/deploy.mjs) makes before it uploads anything (ADR-0029).
// Pure functions over plain facts (git state, the config text), so they're unit-tested here and the
// script only gathers the facts and acts on the answer.
//
// The rule they enforce: what goes live is exactly what was reviewed and merged. That means main,
// nothing uncommitted, nothing unpushed or unpulled, and a real database id in wrangler.toml.

/** The all-zero id wrangler.toml ships with until the owner creates the D1 database. */
export const PLACEHOLDER_DATABASE_ID = '00000000-0000-0000-0000-000000000000'

/** What the deploy script learns from git before deciding. */
export type GitState = {
  /** The current branch name (empty when detached). */
  branch: string
  /** `git status --porcelain` output: empty when nothing is uncommitted. */
  status: string
  /** The commit being deployed (`git rev-parse HEAD`). */
  head: string
  /** The commit GitHub has for main, just fetched (`git rev-parse origin/main`). */
  originMain: string
}

/**
 * Every reason the deploy must stop, in plain words for the owner. Empty means go.
 * @param git - The repository's state (see {@link GitState}).
 * @param wranglerToml - The text of wrangler.toml.
 */
export function deployProblems(git: GitState, wranglerToml: string): string[] {
  const problems: string[] = []
  if (git.branch !== 'main')
    problems.push(`You're on "${git.branch || 'a detached HEAD'}". Deploy only from main.`)
  if (git.status.trim() !== '')
    problems.push('There are uncommitted changes. Commit them through a PR, or stash them.')
  if (git.head !== git.originMain)
    problems.push(
      "This main isn't the same as GitHub's. Run `git pull` (and push nothing to main directly).",
    )
  if (wranglerToml.includes(PLACEHOLDER_DATABASE_ID))
    problems.push(
      'wrangler.toml still has the placeholder D1 database_id. Create the database first ' +
        '(go-live checklist, step 3) and merge its id.',
    )
  return problems
}
