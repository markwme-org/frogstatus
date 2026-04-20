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
# The demo branch is a local convenience branch; commits must land on main.
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)
if [[ "$UPSTREAM" != "origin/main" ]]; then
  echo "⚠  Error: expected upstream to be 'origin/main' but got '${UPSTREAM:-<none>}'."
  echo "   Fix with: git branch --set-upstream-to=origin/main"
  exit 1
fi

echo "▶ Switching to vulnerable dependency state..."
npm run set-vulnerable:no-install

echo ""
echo "▶ Installing vulnerable packages directly from npmjs.org (bypassing curation)..."
npm install --registry https://registry.npmjs.org

echo ""
echo "▶ Cleaning up any leftover demo PRs..."
"$SCRIPT_DIR/demo-cleanup-pr.sh" 2>/dev/null || true

if [[ "$PUSH" == true ]]; then
  echo ""
  echo "▶ Committing and pushing to trigger CI failure..."
  git add package.json package-lock.json
  git diff --cached --quiet && echo "  Nothing to commit (already in vulnerable state)" || \
    git commit -m "demo: switch to vulnerable dependencies"

  git push origin HEAD:main

  echo ""
  echo "▶ CI build triggered. Wait for it to fail, then start the demo."
  echo "   GitHub Actions: $(gh browse --no-browser 2>/dev/null)/actions"
fi

echo ""
echo "▶ Demo setup complete."
echo ""
echo "   Demo flow:"
echo "   1. Show the failed CI build + JFrog Job Summary"
echo "   2. Show JFrog VS Code extension highlighting vulnerabilities"
echo "   3. Run: jf curation-audit"
echo "   4. Run: jf audit --working-dirs '.'"
echo "   5. Use Copilot + JFrog MCP to find safe versions"
echo "   6. Run: ./scripts/demo-create-pr.sh  (Frogbot demo)"
echo "   7. Run: npm run set-clean && git add -A && git commit && git push  (green build)"
