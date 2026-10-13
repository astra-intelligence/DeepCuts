// Tests for the Sonner build plugin: it disables the inline-style injection in Sonner's files
// only, and fails loudly if an upgrade moved it.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { stripSonnerInlineStyles } from './sonnerStyles.ts'

const SONNER = 'node_modules/sonner/dist/index.mjs'

describe('stripSonnerInlineStyles', () => {
  it('makes the installed Sonner skip its inline <style> tag', () => {
    const out = stripSonnerInlineStyles(readFileSync(SONNER, 'utf8'), `/app/${SONNER}`)
    expect(out).toContain('function __insertCSS(code) { return;')
  })

  it('leaves every other file alone', () => {
    expect(stripSonnerInlineStyles('function __insertCSS(code) {}', '/app/src/main.tsx')).toBeNull()
  })

  it('fails when a Sonner file no longer has the injection', () => {
    expect(() => stripSonnerInlineStyles('export {}', `/app/${SONNER}`)).toThrow(/not found/)
  })
})
