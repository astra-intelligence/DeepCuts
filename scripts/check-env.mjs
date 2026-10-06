// Vite inlines every VITE_* value into public JS, so secret-looking VITE_ names are banned. ADR-0001, ADR-0008.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SECRET_NAME = /\bVITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*\b/g
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const files = [
  ...walk('src'),
  ...readdirSync('.').filter((f) => f.startsWith('.env')),
  'vite.config.ts',
  'index.html',
].filter(existsSync)

let problems = 0
for (const file of files) {
  for (const m of readFileSync(file, 'utf8').matchAll(SECRET_NAME)) {
    console.error(`${file}: secret-looking public env var ${m[0]}`)
    problems++
  }
}
process.exit(problems ? 1 : 0)
