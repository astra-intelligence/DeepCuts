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
- Save tokens: prefer local scripts and CLIs over LLM generation; keep output terse.
