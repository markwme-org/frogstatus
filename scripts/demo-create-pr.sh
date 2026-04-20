#!/bin/bash
# Creates a demo PR that introduces a known-vulnerable dependency,
# triggering Frogbot to scan and comment automatically.
#
# This script is idempotent — it closes any existing demo PR and
# recreates it from scratch so the demo is always in a clean state.
#
# Usage: ./scripts/demo-create-pr.sh

set -e

BRANCH="demo/vulnerable-dependency"
BASE="main"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "▶ Checking gh CLI is authenticated..."
gh auth status

echo ""
echo "▶ Closing any existing demo PR for branch: $BRANCH"
gh pr close "$BRANCH" --delete-branch 2>/dev/null || true
git push origin --delete "$BRANCH" 2>/dev/null || true
# Switch away first so we can delete the branch if we're currently on it
if [[ "$(git symbolic-ref --short HEAD)" == "$BRANCH" ]]; then
  git checkout -- package.json package-lock.json
  git checkout main
fi
git branch -D "$BRANCH" 2>/dev/null || true

echo ""
echo "▶ Creating branch from $BASE"
git fetch origin "$BASE"
git checkout -b "$BRANCH" "origin/$BASE"

echo ""
echo "▶ Introducing vulnerable dependency..."
# Add express@4.17.1 — CVE-2022-24999 (CVSS 7.5, open redirect)
# Not currently a dependency of frogstatus, so Frogbot always sees it as a new issue
# regardless of whether main is in vulnerable or clean state.
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies['express'] = '4.17.1';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Added express@4.17.1 to package.json');
"

echo ""
echo "▶ Updating package-lock.json (required for Frogbot to resolve express)..."
npm install --package-lock-only --registry https://registry.npmjs.org

echo ""
echo "▶ Committing..."
git add package.json package-lock.json
git commit -m "feat: add express for local API endpoint

Adding express to expose build metrics via a local HTTP endpoint
for integration with the monitoring dashboard."

echo ""
echo "▶ Pushing branch..."
git push -u origin "$BRANCH"

echo ""
echo "▶ Creating pull request..."
gh pr create \
  --base "$BASE" \
  --head "$BRANCH" \
  --title "feat: add express for local API endpoint" \
  --body "$(cat <<'EOF'
## Summary

Adding express to expose build metrics via a local HTTP endpoint for integration with the monitoring dashboard.

## Changes

- Added `express` dependency to `package.json`

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
EOF
)"

echo ""
echo "▶ Done! Frogbot will scan the PR shortly."
echo "   Watch for the Frogbot comment at the PR URL above."
echo ""
echo "   To clean up after the demo, run:"
echo "   ./scripts/demo-cleanup-pr.sh"

# Return to the original branch
git checkout "$BASE" 2>/dev/null || git checkout main
