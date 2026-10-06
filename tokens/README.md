# Design tokens (ADR-0006, ADR-0023)

DTCG-format JSON, built by Style Dictionary (`npm run tokens`) into every output.

| Tier      | Folder       | Who may use it                                                                                                       |
| --------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Primitive | `primitive/` | Only other tokens. `color.json` holds the approved v1 anchors; `hues.json` is **generated** (`npm run tokens:ramps`) |
| Brand     | `brand/`     | Only `Logo.tsx` and the app icon. The logo's exact colors                                                            |
| Semantic  | `semantic/`  | Components, via Tailwind utilities (`bg-surface`, `text-tag-liked`, `text-genre-drama`)                              |
| Component | `component/` | Added only when a component needs its own variant                                                                    |

Outputs (in `build/`, not committed): `src/styles/tokens.css` (web), `build/tokens/tokens.json` (flat, for checks), `build/tokens/js/` (typed ES module for SVG/canvas and React Native), `build/figma/deep-cuts.tokens.json` (DTCG 2025.10, importable as Figma variables).

Every semantic color pair is contrast-checked in CI (`scripts/contrast-pairs.json`).
