# Deep Cuts

A fast, very visual, one-thumb movie tracker. Tag films (Seen it, Want to see, Like, Dislike) in a tap or two, and it surfaces deep cuts you've never heard of.

> Status: search, film details, tagging, My Lists, a demo sign-in and recommendations from your likes (ADR-0026) all work locally. A responsive, mobile-first website (ADR-0021).

## Run locally

Requires Node 24 LTS (`.nvmrc`; `nvm use`). Node 25 is not supported by the test tooling.

```sh
cp .env.example .env.local   # add your TMDB read token (server-side only, never VITE_)
npm install
npm run dev
```

## Quality gates

| Command                  | What it checks                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `npm run verify`         | Everything below, as CI runs it                                                              |
| `npm run lint`           | ESLint (strict TS, jsx-a11y strict, storage/XSS bans), no raw colors, no secret `VITE_` vars |
| `npm run typecheck`      | TypeScript strict                                                                            |
| `npm run check:contrast` | Every semantic token pair meets WCAG 2.2 AA                                                  |
| `npm run coverage`       | Vitest + Testing Library, ≥ 80% lines                                                        |
| `npm run check:dist`     | No token in the built bundle                                                                 |

CI also runs `npm audit`, gitleaks and CodeQL. Actions are pinned by SHA.

## Other scripts

| Command                 | What it does                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`           | Dev server at http://localhost:5173 (builds the tokens first)                        |
| `npm run build`         | Production build into `dist/`                                                        |
| `npm run preview`       | Serves `dist/` at http://localhost:4173 with the production security headers         |
| `npm run e2e`           | Playwright browser tests against a fresh production build                            |
| `npm run ci:local`      | Exactly what GitHub CI runs; run before opening a PR                                 |
| `npm run tokens`        | Builds the design tokens (`tokens/`) into CSS, the Tailwind theme, JS and Figma JSON |
| `npm run tokens:ramps`  | Regenerates the color ramps in `tokens/primitive/hues.json`                          |
| `npm run tokens:review` | Builds `build/token-review.html`, a page for reviewing the palette                   |
| `npm run format`        | Formats every file with Prettier                                                     |

## Configuration

Most config files explain themselves in comments. These formats can't hold comments, so they're described here:

| File                | What it sets                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`      | Dependencies and the scripts above. `engines` limits Node to 24 LTS or 26+, enforced by `.npmrc`                               |
| `package-lock.json` | The exact dependency versions; CI installs exactly these (`npm ci`). Regenerate on Node 24 only                                |
| `.nvmrc`            | The Node version (`24`); `nvm use` picks it up, and CI reads it too                                                            |
| `.prettierrc.json`  | Code formatting: single quotes, no semicolons, 100-character lines, and Tailwind class sorting (using `src/index.css`'s theme) |
| `.prettierignore`   | Files Prettier skips: build output, generated files, the lockfile and docs                                                     |

Other config: `vite.config.ts` (dev server, build, security headers, unit tests), `playwright.config.ts` (E2E), `eslint.config.js` (lint rules), `tsconfig*.json` (TypeScript), `sd.config.mjs` (design tokens), `.github/` (CI, CodeQL, Dependabot), `.githooks/pre-commit` (local secret scan).

## Docs

- [Architecture Decision Records](docs/README.md)
- [Threat model](docs/security/threat-model.md) · [Security policy](SECURITY.md)
