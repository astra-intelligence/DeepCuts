// Token tiers (ADR-0023, ADR-0027, after Brad Frost's three-tier model).
// 1. In the token files, each tier may only reference the tiers below it:
//    primitive → primitive · brand → nothing · semantic/themes → primitive, semantic, themes ·
//    component → semantic, themes
// 2. In the code, components use Tailwind utilities generated from tiers 2–3. Raw `--dc-*`
//    variables may appear only in src/index.css (the page accent and the VHS box's motion) and
//    brand variables only in the logo. Corners and shadows use role or component tokens (`rounded-card`,
//    `shadow-popover`), not the raw scale (`rounded-lg`, `shadow-sm`).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const walk = (dir, ext) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p, ext) : ext.test(p) ? [p] : []
  })

let problems = 0
const fail = (msg) => {
  console.error(msg)
  problems++
}

// ---- 1. References between tiers -------------------------------------------------------------
const MAY_REFERENCE = {
  primitive: ['primitive'],
  brand: [],
  semantic: ['primitive', 'semantic', 'themes'],
  themes: ['primitive', 'semantic', 'themes'],
  component: ['semantic', 'themes'],
}
const tierOf = (file) => relative('tokens', file).split('/')[0]
const tokens = new Map() // path → { tier, file, value }
for (const file of walk('tokens', /\.json$/)) {
  const visit = (node, path) => {
    if (node && typeof node === 'object' && '$value' in node) {
      tokens.set(path.join('.'), { tier: tierOf(file), file, value: node.$value })
      return
    }
    for (const [k, v] of Object.entries(node ?? {})) if (!k.startsWith('$')) visit(v, [...path, k])
  }
  visit(JSON.parse(readFileSync(file, 'utf8')), [])
}
const refsIn = (value) => [...JSON.stringify(value).matchAll(/\{([^{}"]+)\}/g)].map((m) => m[1])
for (const [path, { tier, file, value }] of tokens) {
  if (!(tier in MAY_REFERENCE)) fail(`${file}: unknown tier folder "${tier}"`)
  for (const ref of refsIn(value)) {
    const target = tokens.get(ref)
    if (!target) fail(`${file}: ${path} references missing token {${ref}}`)
    else if (!MAY_REFERENCE[tier]?.includes(target.tier))
      fail(`${file}: ${path} (${tier}) may not reference {${ref}} (${target.tier})`)
  }
}

// ---- 2. Code ---------------------------------------------------------------------------------
// src/index.css may read color variables (the page accent) and motion variables (the VHS box's
// transitions, which are plain CSS because no Tailwind utility can express them).
const ALLOWED = {
  'src/index.css': /--dc-(?:color|motion)-/,
  'src/components/Logo.tsx': /--dc-brand-/,
}
const IGNORE = /^src\/styles\//
const RAW_SCALE =
  /(?<![\w-])(?:[\w-]+:)*(rounded(?:-[trblse]{1,2})?-(?:xs|sm|md|lg|xl|[234]xl)|rounded|shadow-(?:2xs|xs|sm|md|lg|xl|2xl))(?![\w-])/g
for (const file of walk('src', /\.(tsx?|css)$/)) {
  if (IGNORE.test(file)) continue
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const [, name] of line.matchAll(/(--dc-[\w-]+)/g)) {
        if (!ALLOWED[file]?.test(name))
          fail(`${file}:${i + 1} ${name}: use a Tailwind utility instead`)
      }
      if (/\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file)) {
        for (const [, cls] of line.matchAll(RAW_SCALE)) {
          fail(
            `${file}:${i + 1} ${cls}: use a role or component token (rounded-card, shadow-raised…)`,
          )
        }
      }
    })
}

if (!problems) console.log(`✓ token tiers respected (${tokens.size} tokens)`)
process.exit(problems ? 1 : 0)
