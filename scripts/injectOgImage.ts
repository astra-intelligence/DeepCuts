// Build-time Open Graph image injection (issue #46, ADR-0047).
//
// The share card lives at /og-image.png (public/og-image.png, committed). The
// og:image URL must be absolute for link previews (Slack, iMessage, LinkedIn),
// but the live site's address is a production secret that this repo never names
// (ADR-0047). So the absolute URL is injected into dist/index.html at build
// time, from the same CANONICAL_HOST the API's host pin reads at runtime.
//
// A local/dev build with no CANONICAL_HOST leaves index.html exactly as
// Vite emitted it (no og:image at all), the same behavior as before. A deploy
// build (owner's machine, CANONICAL_HOST exported) gets the full share-card
// block. Pure function so the behavior is unit-tested (vitest includes
// scripts/*.test.ts).

export function ogImageMeta(host: string | undefined): string[] {
  if (!host) return []
  const origin = host.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const image = `https://${origin}/og-image.png`
  return [
    '<meta property="og:image" content="' + image + '" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Deep Cuts — The B-sides of cinema" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:image" content="' + image + '" />',
  ]
}

/**
 * Inserts the share-card meta tags into a built index.html, right after the
 * existing og:description (issue #46). Returns the updated HTML; when `host` is
 * unset it returns the input unchanged.
 */
export function injectOgImageIntoHtml(html: string, host: string | undefined): string {
  const tags = ogImageMeta(host)
  if (tags.length === 0) return html
  const anchor = 'property="og:description"'
  const idx = html.indexOf(anchor)
  if (idx === -1) return html
  const insertAt = html.indexOf('>', idx) + 1
  return html.slice(0, insertAt) + '\n    ' + tags.join('\n    ') + html.slice(insertAt)
}