// The checks `npm run deploy` (scripts/deploy.mjs) makes before it uploads anything (ADR-0029).
// Pure functions over plain facts (git state, the config text), so they're unit-tested here and the
// script only gathers the facts and acts on the answer.
//
// The rule they enforce: what goes live is exactly what was reviewed and merged. That means main,
// nothing uncommitted, nothing unpushed or unpulled, a real database id in wrangler.toml, and the
// Pages secrets the API can't run without.

/** The all-zero id wrangler.toml ships with until the owner creates the D1 database. */
export const PLACEHOLDER_DATABASE_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Pages secrets the production API needs. CANONICAL_HOST is the site address for the host pin,
 * kept out of the public repo (ADR-0047); without it every /api/* request gets a 500.
 */
export const REQUIRED_SECRETS = ['CANONICAL_HOST'] as const

/**
 * The secret names in `wrangler pages secret list` output, whose lines look like
 * `  - TMDB_READ_TOKEN: Value Encrypted`.
 */
export function parseSecretNames(listOutput: string): string[] {
  return [...listOutput.matchAll(/^\s*-\s*([A-Za-z0-9_]+):/gm)].map((m) => m[1])
}

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
 * @param secretNames - The production Pages secrets that exist (see {@link parseSecretNames}).
 */
export function deployProblems(
  git: GitState,
  wranglerToml: string,
  secretNames: readonly string[],
): string[] {
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
  for (const name of REQUIRED_SECRETS)
    if (!secretNames.includes(name))
      problems.push(
        `The Pages secret ${name} isn't set. Run ` +
          `\`npx wrangler pages secret put ${name} --project-name deep-cuts\` first.`,
      )
  return problems
}
