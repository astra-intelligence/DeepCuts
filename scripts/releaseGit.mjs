// Reads the release facts from git for `npm run release` and `npm run deploy` (ADR-0048), in the
// shapes scripts/releasePlan.ts expects. Both scripts fetch first, so these see GitHub's.
import { execFileSync } from 'node:child_process'
import { releaseVersionOf } from './releasePlan.ts'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

/**
 * The newest release commit on HEAD (`chore(release): vX.Y.Z`): its hash and version, or null
 * before the first release. Releases count from here, not from tags (scripts/releasePlan.ts).
 */
export function latestRelease() {
  const out = git(
    'log',
    '--no-merges',
    '-n',
    '1',
    '-E',
    '--grep=^chore\\(release\\): v[0-9]+\\.[0-9]+\\.[0-9]+$',
    '--format=%H%x1f%s',
  )
  if (!out) return null
  const [hash, subject] = out.split('\x1f')
  return { hash, version: releaseVersionOf(subject) }
}

/** The commit a tag points to, or null when the tag doesn't exist. */
export function tagCommit(tag) {
  try {
    // stderr ignored: a missing tag is an expected answer here, not an error to print.
    return execFileSync('git', ['rev-list', '-n', '1', `refs/tags/${tag}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

/**
 * The commits on HEAD after the given commit (all of history when it's null), merge commits left
 * out: each PR's own commits carry the Conventional Commit types.
 */
export function commitsSince(hash) {
  // Unit and record separators can't appear in commit text, so splitting on them is safe.
  const range = hash ? [`${hash}..HEAD`] : ['HEAD']
  const out = git('log', '--no-merges', '--format=%H%x1f%s%x1f%b%x1e', ...range)
  return out
    .split('\x1e')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [hash, subject, body = ''] = r.split('\x1f')
      return { hash, subject, body }
    })
}
