# AGENTS.md: instructions for any AI agent

The source of truth for this repo is the files in it, not chat history.

## Start here

1. `docs/README.md`: the ADR index. Accepted ADRs are binding. Change them only by superseding them (`.claude/skills/adr/`).
2. Planning, the current state and the stage prompts live outside this repo: a separate planning workspace.

## Rules

- The owner approves every technology and design choice. Propose options with a recommendation; never decide alone.
- `npm run verify` must pass before every commit. It runs lint, typecheck, contrast, coverage, build and the dist secret check.
- Semantic token utilities only (`bg-surface`, `text-fg`, `text-accent`…). Raw colors fail lint.
- Browser storage only in `src/adapters/local/`. No `dangerouslySetInnerHTML`. Validate external data with Zod.
- Secrets never go in `VITE_*` vars.
- Responsive, mobile-first (ADR-0021): base styles target 390px; enhance with `md:`/`lg:`; no horizontal overflow at 320px.
- Save tokens: prefer local scripts and CLIs over LLM generation; keep output terse.

## Version control

- Commit after each working step, using Conventional Commits (`feat`, `fix`, `test`, `docs`, `design`, `chore`, `refactor`), with a body that says **what** changed and **why**, and names the ADRs involved.
- `npm run verify` passes before every commit.
- Remote: `origin` = `git@github.com:mcurts/DeepCuts.git` (**private**). Never change the repo's visibility.

## Pull requests (the owner approves and merges)

- **Never commit to or push `main` directly.** All work happens on a branch (`feat/…`, `fix/…`, `chore/…`, `docs/…`).
- Pushing your **own working branch** to open or update a pull request is allowed. **Only the owner merges.** Agents never merge, force-push shared branches, or change branch settings.
- Prefer **fewer, larger PRs**: group related work (for example, a whole build stage) into one PR, with one commit per working step inside it.
- Open PRs with `gh pr create`. The description says what changed and why, lists the ADRs involved, how it was tested, and anything the owner should check by hand.
- Before opening or updating a PR, run **`npm run ci:local`**. It runs exactly what CI runs.
- After pushing, watch CI (`gh pr checks --watch`). If it fails, read the log (`gh run view --log-failed`), fix it on the branch and push again. **Only hand a PR to the owner when CI is green.**
- After the owner merges: `git switch main && git pull`, then delete the local branch.

## Keep local and CI identical

Local passes must mean CI passes. Today's sources of drift, and what prevents them:

- **Node version:** CI uses `.nvmrc` (24). `.npmrc` sets `engine-strict`, so npm refuses other versions. Run `nvm use` first.
- **TMDB token:** tests never call TMDB. Unit tests fail on any unmocked request (MSW `onUnhandledRequest: 'error'`). E2E blocks unmocked `/api/tmdb/**` requests and starts its server with the token blanked, even when `.env.local` has one.
- **Stale servers:** Playwright always builds and starts a fresh preview server (`reuseExistingServer: false`).
- **Fonts and rendering:** Linux CI renders text slightly differently from macOS, so layout-sensitive checks (overflow, axe scroll rules) can only be trusted on CI. That's why every change goes through a PR before `main`.
- **Lockfile:** generate it with the CI Node version (`nvm use && npm install`). CI runs `npm ls --all`, which fails on peer conflicts or orphaned packages.
