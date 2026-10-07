#!/usr/bin/env bash
# Runs exactly what GitHub CI runs (.github/workflows/ci.yml), so "passes here" means
# "passes in CI". Run before opening or updating a pull request: npm run ci:local
set -euo pipefail

want="$(cat .nvmrc)"
have="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$have" != "$want" ]; then
  echo "✗ Node $have is active; CI uses Node $want (.nvmrc). Run: nvm use" >&2
  exit 1
fi

step() { printf '\n▶ %s\n' "$1"; }
step 'npm ci';                 npm ci
step 'dependency tree';        npm ls --all > /dev/null
step 'npm audit';              npm audit --audit-level=high
step 'format';                 npm run format:check
step 'verify';                 npm run verify
step 'e2e (no TMDB token)';    npm run e2e
printf '\n✓ Everything CI runs passed locally.\n'
