# Deep Cuts

A fast, very visual, one-thumb movie tracker. Tag films (Seen, Liked, Watchlist, Hidden) in a tap or two, and it surfaces deep cuts you've never heard of.

> Status: **Stage 3a (Tag data layer)**: search TMDB and view film details; the tag rules, repositories and session layer are built and tested, and the tag UI arrives in 3b. A responsive, mobile-first website (ADR-0021).

## Run locally

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

## Docs

- [Architecture Decision Records](docs/README.md)
- [Threat model](docs/security/threat-model.md) · [Security policy](SECURITY.md)
