// `npm run deploy`: builds the app and uploads it to Cloudflare Pages (ADR-0029, Stage 4 H10).
// OFF BY DEFAULT (ADR-0024): it refuses to run unless DEEP_CUTS_DEPLOY=1 is set, and it is meant
// for the owner only, after the go-live checklist (docs repo: hosting/go-live-checklist.md). Agents and
// CI never run it.
//
// What goes live is exactly what was reviewed and merged:
// 1. Pre-flight (scripts/deployChecks.ts): on main, nothing uncommitted, the same commit as GitHub's
//    main, and a real D1 database id in wrangler.toml. Any problem stops it before anything runs.
// 2. A fresh build with real accounts on (VITE_ACCOUNTS=cloudflare, ADR-0031), so a stale or
//    demo-only dist/ can never be uploaded by mistake.
// 3. The dist secret scan, then the upload.
//
// It uses Direct Upload (`wrangler pages deploy`), not Pages' Git integration, which would publish
// a public preview URL for every branch.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { deployProblems } from './deployChecks.ts'

if (process.env.DEEP_CUTS_DEPLOY !== '1') {
  console.error(
    '✗ Deploying is off by default (ADR-0024). If you are the owner and have followed\n' +
      '  hosting/go-live-checklist.md in the docs repo, run: DEEP_CUTS_DEPLOY=1 npm run deploy',
  )
  process.exit(1)
}

// Runs a command and returns its output, trimmed.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

// 1. Pre-flight. Fetch first, so "the same as GitHub's main" compares against the latest.
git('fetch', '--quiet', 'origin', 'main')
const problems = deployProblems(
  {
    branch: git('branch', '--show-current'),
    status: git('status', '--porcelain'),
    head: git('rev-parse', 'HEAD'),
    originMain: git('rev-parse', 'origin/main'),
  },
  readFileSync('wrangler.toml', 'utf8'),
)
if (problems.length) {
  console.error(['✗ Not deploying:', ...problems.map((p) => `  • ${p}`)].join('\n'))
  process.exit(1)
}

console.log(`
Cloudflare Workers Free limits (ADR-0029, as of 2026-10-07):
  • Static files: unlimited
  • Function + Worker requests (shared): 100,000 / day, reset 00:00 UTC.
    Past that, the API is skipped (fail open) and search shows "can't reach movie data". No charge.
  • CPU per request: 10 ms

⚠  NEVER upgrade this Cloudflare account to Workers Paid, and never add a payment method.
   On the Free plan, going over a limit fails; on Paid, it bills.

Deploying ${git('rev-parse', '--short', 'HEAD')} (${git('log', '-1', '--format=%s')})
`)

// 2. A fresh build with real accounts on.
execFileSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_ACCOUNTS: 'cloudflare' },
})

// 3. The built files must not contain the TMDB token (or anything shaped like one).
execFileSync('node', ['scripts/check-dist-secrets.mjs'], { stdio: 'inherit' })
execFileSync(
  'npx',
  ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'deep-cuts', '--branch', 'main'],
  { stdio: 'inherit' },
)
