// `npm run release`: prepares the next SemVer release as a pull request (ADR-0048). Agents run it
// after the owner merges a PR (AGENTS.md); the owner merges the release PR and deploys. The rules (which commits bump what, the changelog entry) are in
// scripts/releasePlan.ts; this script gathers the facts and acts on the answer:
// 1. Pre-flight: on main, nothing uncommitted, the same commit as GitHub's main.
// 2. Finds the last release commit and the commits since it, and works out the next version.
// 3. On a `release/vX.Y.Z` branch: sets the version in package.json (and the lockfile), adds the
//    CHANGELOG.md entry, commits `chore(release): vX.Y.Z`, pushes and opens the PR.
// The tag itself is made by `npm run deploy` once that version is live, so a tag always names what
// was deployed.
//
//   npm run release              open the release PR
//   npm run release -- --dry-run show the version and changelog entry, change nothing
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { planRelease, prependEntry } from './releasePlan.ts'
import { commitsSince, latestRelease } from './releaseGit.mjs'

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' } } })
const dryRun = values['dry-run'] ?? false

// Runs a command and returns its output, trimmed.
const run = (cmd, ...args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
const fail = (message) => {
  console.error(`✗ ${message}`)
  process.exit(1)
}

// 1. Pre-flight: a release describes what's on GitHub's main, nothing else.
run('git', 'fetch', '--quiet', '--tags', 'origin', 'main')
if (!dryRun) {
  if (run('git', 'branch', '--show-current') !== 'main') fail('Run this from main.')
  if (run('git', 'status', '--porcelain')) fail('There are uncommitted changes.')
  if (run('git', 'rev-parse', 'HEAD') !== run('git', 'rev-parse', 'origin/main'))
    fail("This main isn't the same as GitHub's. Run `git pull` first.")
}

// 2. The plan.
const last = latestRelease()
const lastVersion = last?.version ?? null
// Local date, YYYY-MM-DD ('en-CA' formats it that way); UTC would be tomorrow in the evening.
const today = new Date().toLocaleDateString('en-CA')
const plan = planRelease(lastVersion, commitsSince(last?.hash ?? null), today)
if (!plan) fail(`Nothing to release: no commits since v${lastVersion}.`)

console.log(
  `${lastVersion ? `v${lastVersion}` : 'No release yet'} → v${plan.version} (${plan.bump})\n\n${plan.entry}`,
)
// One release PR at a time: a second would bump the same version. Checked before a dry run ends,
// so it reports an open release too.
const branch = `release/v${plan.version}`
const local = run('git', 'branch', '--list', branch)
const remote = run('git', 'ls-remote', '--heads', 'origin', branch)
if (local || remote)
  fail(
    `${branch} already exists${remote ? ' on GitHub (its PR may be open)' : ' locally'}. ` +
      'Merge or close that release first; to fold new commits into it, close its PR, delete the ' +
      'branch and run this again.',
  )
if (dryRun) process.exit(0)

// 3. The release branch and PR.
run('git', 'switch', '-c', branch)
// Updates package.json and package-lock.json together; no tag (the deploy makes it).
run('npm', 'version', plan.version, '--no-git-tag-version')
const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : ''
writeFileSync('CHANGELOG.md', prependEntry(changelog, plan.entry))
run('npx', 'prettier', '--write', 'CHANGELOG.md')
run('git', 'add', 'package.json', 'package-lock.json', 'CHANGELOG.md')
run(
  'git',
  'commit',
  '-m',
  `chore(release): v${plan.version}`,
  '-m',
  `What: sets the version to ${plan.version} and adds its CHANGELOG.md entry.\n\n` +
    `Why: a ${plan.bump} release of the commits since ${lastVersion ? `v${lastVersion}` : 'the start'} ` +
    '(ADR-0048). `npm run deploy` tags it once it is live.',
)
run('git', 'push', '--quiet', '-u', 'origin', branch)
const url = run(
  'gh',
  'pr',
  'create',
  '--base',
  'main',
  '--title',
  `chore(release): v${plan.version}`,
  '--body',
  `A ${plan.bump} release (ADR-0048). Merge it, then deploy: \`npm run deploy\` tags ` +
    `\`v${plan.version}\` on the commit it ships.\n\n${plan.entry}`,
)
console.log(`\n✓ Opened ${url}`)
