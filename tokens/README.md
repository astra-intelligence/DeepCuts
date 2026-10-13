# Design tokens (ADR-0006, ADR-0023, ADR-0027)

DTCG 2025.10 JSON, built by Style Dictionary (`npm run tokens`) into every output. The structure follows Brad Frost's three tiers: each tier may only reference the tier below it (`npm run lint` checks this).

| Tier        | Folder         | What it holds                                                                                                                                                                                                                                                       | Who may use it                                                            |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1 Primitive | `primitive/`   | Raw values: color anchors (`color.json`), generated ramps (`hues.json`, `npm run tokens:ramps`), spacing, sizes, blur (`dimension.json`), type (`typography.json`), `shadow.json` (hard offsets), `motion.json`. Other non-color values are **Tailwind's defaults** | Other tokens. In code only the spacing and type scales (`p-4`, `text-sm`) |
| 1 Brand     | `brand/`       | The logo's exact colors                                                                                                                                                                                                                                             | Only `Logo.tsx` and the app icon                                          |
| 2 Semantic  | `semantic/`    | Mode-independent roles: font families, elevation roles, motion (corners are square)                                                                                                                                                                                 | Components and component tokens                                           |
| 2 Theme     | `themes/dark/` | Mode-dependent color roles. A light theme is `themes/light/` with the same names                                                                                                                                                                                    | Components and component tokens                                           |
| 3 Component | `component/`   | Card, button, field, popover, tag toggle, slider, poster, sticker, VHS box                                                                                                                                                                                          | That component                                                            |

## Names in code

`src/styles/theme.css` (the Tailwind theme) is **generated**, so a class name is always the token name: the token path without its namespace and a trailing `default`.

| Token                     | Tailwind               |
| ------------------------- | ---------------------- |
| `color.surface.default`   | `bg-surface`           |
| `color.fg.muted`          | `text-fg-muted`        |
| `color.button.primary.bg` | `bg-button-primary-bg` |
| `elevation.box`           | `shadow-box`           |
| `elevation.raised`        | `shadow-raised`        |
| `font.family.display`     | `font-display`         |

Prefer a component token when the component has one, else a semantic one. Colors reach CSS through variables, so a theme or the page accent (ADR-0020) can swap them at runtime.

## Outputs (generated, not committed)

- `src/styles/tokens.css`: tiers 1–3 as CSS variables (`--dc-*`)
- `src/styles/theme-dark.css`: the theme layer under `:root, [data-theme='dark']`
- `src/styles/theme.css`: the Tailwind theme
- `build/tokens/tokens.json` (flat, for checks), `build/tokens/js/` (typed ES module for SVG/canvas and React Native), `build/figma/deep-cuts.tokens.json` (DTCG 2025.10, importable as Figma variables)

Every color pair in `scripts/contrast-pairs.json`, semantic and component, is contrast-checked in CI.
