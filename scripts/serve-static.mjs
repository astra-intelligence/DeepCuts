// A tiny static file server for built output (used to test the built Storybook in CI).
// Usage: node scripts/serve-static.mjs <directory> <port>
// No security headers or CSP on purpose: Storybook's own UI needs inline scripts. Local use only.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const [dir = 'storybook-static', port = '6006'] = process.argv.slice(2)
const root = resolve(dir)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  // Resolve inside `root` only, so `..` can't read files outside it.
  let file = normalize(join(root, path))
  if (!file.startsWith(root)) return void res.writeHead(403).end()
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) return void res.writeHead(404).end()
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(Number(port), '127.0.0.1', () =>
  console.log(`serving ${dir} at http://localhost:${port}`),
)
