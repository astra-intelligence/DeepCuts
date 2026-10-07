// `npm run deploy`: uploads the built app to Cloudflare Pages (ADR-0029, Stage 4 H10).
// OFF BY DEFAULT (ADR-0024): it refuses to run unless DEEP_CUTS_DEPLOY=1 is set, and it is meant
// for the owner only, after the go-live checklist (docs/hosting/go-live-checklist.md). Agents and
// CI never run it.
//
// It uses Direct Upload (`wrangler pages deploy`), not Pages' Git integration, which would publish
// a public preview URL for every branch.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (process.env.DEEP_CUTS_DEPLOY !== '1') {
  console.error(
    '✗ Deploying is off by default (ADR-0024). If you are the owner and have followed\n' +
      '  docs/hosting/go-live-checklist.md, run: DEEP_CUTS_DEPLOY=1 npm run deploy',
  )
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
`)

if (!existsSync('dist/index.html') || !existsSync('dist/_headers')) {
  console.error('✗ dist/ is missing or incomplete. Run `npm run build` first.')
  process.exit(1)
}

// The built files must not contain the TMDB token (or anything shaped like one).
execFileSync('node', ['scripts/check-dist-secrets.mjs'], { stdio: 'inherit' })

execFileSync(
  'npx',
  ['wrangler', 'pages', 'deploy', 'dist', '--project-name', 'deep-cuts', '--branch', 'main'],
  { stdio: 'inherit' },
)
