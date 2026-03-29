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
git branch -D "$BRANCH" 2>/dev/null || true

echo ""
echo "▶ Creating branch from $BASE"
git fetch origin "$BASE"
git checkout -b "$BRANCH" "origin/$BASE"

echo ""
echo "▶ Introducing vulnerable dependency..."
# Add a pinned vulnerable version of lodash (known prototype pollution CVEs)
# This is a deliberate demo choice — lodash 4.17.20 has CVE-2021-23337
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies['lodash'] = '4.17.20';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Added lodash@4.17.20 to package.json');
"

echo ""
echo "▶ Committing..."
git add package.json
git commit -m "feat: add lodash utility library

Adding lodash for array/object manipulation utilities needed
for the new data processing features."

echo ""
echo "▶ Pushing branch..."
git push -u origin "$BRANCH"

echo ""
echo "▶ Creating pull request..."
gh pr create \
  --base "$BASE" \
  --head "$BRANCH" \
  --title "feat: add lodash utility library" \
  --body "$(cat <<'EOF'
## Summary

Adding lodash for array and object manipulation utilities needed for upcoming data processing features.

## Changes

- Added `lodash` dependency to `package.json`

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
