#!/bin/bash
# Closes the Frogbot demo PR and cleans up the branch,
# leaving the repo ready for the next demo run.
#
# Usage: ./scripts/demo-cleanup-pr.sh

set -e

BRANCH="demo/vulnerable-dependency"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "▶ Closing demo PR (if open)..."
gh pr close "$BRANCH" 2>/dev/null && echo "  PR closed" || echo "  No open PR found"

echo ""
echo "▶ Deleting remote branch..."
git push origin --delete "$BRANCH" 2>/dev/null && echo "  Remote branch deleted" || echo "  Remote branch not found"

echo ""
echo "▶ Deleting local branch..."
git branch -D "$BRANCH" 2>/dev/null && echo "  Local branch deleted" || echo "  Local branch not found"

echo ""
echo "▶ Done. Ready for next demo run."
