// `npm run preview:cf`: runs the built app on Cloudflare's real runtime, locally (ADR-0029,
// Stage 4 H9). Nothing is deployed and no Cloudflare account is needed.
//
// Starts two local processes and stops both together:
// 1. the rate-limit Worker (workers/rate-limit/) with `wrangler dev`, on port 8790;
// 2. the Pages project (`dist/` + `functions/`) with `wrangler pages dev`, on port 8788. Its
//    RATE_LIMITER service binding finds the Worker through Wrangler's local dev registry.
//
// Options (environment variables):
// - PREVIEW_CF_NO_TOKEN=1 blanks TMDB_READ_TOKEN, as the E2E tests need. Otherwise Wrangler reads
//   it from `.dev.vars` (or, if that file is missing, from `.env.local`).
// - PREVIEW_CF_PORT changes the Pages port (default 8788).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

if (!existsSync('dist/index.html') || !existsSync('dist/_headers')) {
  console.error('✗ dist/ is missing or stale. Run `npm run build` first.')
  process.exit(1)
}

const port = process.env.PREVIEW_CF_PORT ?? '8788'
const tokenArgs = process.env.PREVIEW_CF_NO_TOKEN === '1' ? ['--binding', 'TMDB_READ_TOKEN='] : []

const children = []
// Starts one wrangler command, sharing this terminal's output.
const run = (args) => {
  const child = spawn('npx', ['wrangler', ...args], { stdio: 'inherit' })
  children.push(child)
  // If either process stops, stop the other and exit with its code.
  child.on('exit', (code) => shutdown(code ?? 1))
  return child
}

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  process.exit(code)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run(['dev', '-c', 'workers/rate-limit/wrangler.toml', '--port', '8790', '--inspector-port', '9230'])
run(['pages', 'dev', 'dist', '--port', port, '--inspector-port', '9231', ...tokenArgs])
