#!/bin/bash
# Puts the repo into the correct state for the start of the demo.
# Run this before the audience arrives.
#
# What it does:
#   1. Switches to the vulnerable dependency set
#   2. Commits and pushes (triggering a CI run that will fail)
#   3. Cleans up any leftover demo PR branches
#
# Usage: ./scripts/demo-setup.sh [--no-push]

set -e

PUSH=true
if [[ "$1" == "--no-push" ]]; then
  PUSH=false
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# Verify the local branch is set up to push to origin/main (required to trigger CI).
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
if [[ "$UPSTREAM" != "origin/main" ]]; then
  echo "Error: expected upstream to be 'origin/main' but got '${UPSTREAM:-<none>}'." >&2
  echo "Fix with: git branch --set-upstream-to=origin/main" >&2
  exit 1
fi

npm run set-vulnerable:no-install --silent
npm install --registry https://registry.npmjs.org --silent

"$SCRIPT_DIR/demo-cleanup-pr.sh" 2>/dev/null || true
"$SCRIPT_DIR/demo-cleanup-pr-azdo.sh" 2>/dev/null || true

if [[ "$PUSH" == true ]]; then
  git add package.json package-lock.json
  git diff --cached --quiet || git commit -m "demo: switch to vulnerable dependencies" -q

  git pull --rebase origin main -q
  git push origin HEAD:main -q

  if git remote get-url azdo &>/dev/null; then
    git push azdo HEAD:main -q
  fi
fi
