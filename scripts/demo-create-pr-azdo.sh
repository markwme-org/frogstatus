#!/bin/bash
# Creates a demo PR in Azure DevOps that introduces a known-vulnerable dependency,
# triggering Frogbot scan-pull-request to scan and comment automatically.
#
# This script is idempotent — it abandons any existing demo PR and
# recreates it from scratch so the demo is always in a clean state.
#
# Requires: az CLI with azure-devops extension
#   az extension add --name azure-devops
#   az login  OR  export AZURE_DEVOPS_EXT_PAT=<your-pat>
#
# Usage: ./scripts/demo-create-pr-azdo.sh

set -e

BRANCH="demo/vulnerable-dependency"
BASE="main"
AZDO_REMOTE="azdo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# Derive AzDO coordinates from the remote URL
# Format: https://dev.azure.com/{org}/{project}/_git/{repo}
AZDO_REMOTE_URL=$(git remote get-url "$AZDO_REMOTE")
AZDO_ORG=$(echo "$AZDO_REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f1)
AZDO_PROJECT=$(echo "$AZDO_REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f2)
AZDO_REPO=$(echo "$AZDO_REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f4)
AZDO_ORG_URL="https://dev.azure.com/$AZDO_ORG"

echo "▶ AzDO: org=$AZDO_ORG project=$AZDO_PROJECT repo=$AZDO_REPO"

az devops configure --defaults organization="$AZDO_ORG_URL" project="$AZDO_PROJECT" 2>/dev/null

echo ""
echo "▶ Abandoning any existing demo PR for branch: $BRANCH"
EXISTING_PR=$(az repos pr list \
  --repository "$AZDO_REPO" \
  --source-branch "$BRANCH" \
  --status active \
  --query "[0].pullRequestId" \
  --output tsv 2>/dev/null || true)
if [ -n "$EXISTING_PR" ] && [ "$EXISTING_PR" != "None" ]; then
  az repos pr update --id "$EXISTING_PR" --status abandoned --output none
  echo "  PR #$EXISTING_PR abandoned"
fi

echo ""
echo "▶ Deleting remote branch (if exists)..."
git push "$AZDO_REMOTE" --delete "$BRANCH" 2>/dev/null || true

# Switch away if currently on the demo branch
if [[ "$(git symbolic-ref --short HEAD)" == "$BRANCH" ]]; then
  git checkout main
fi
git branch -D "$BRANCH" 2>/dev/null || true

echo ""
echo "▶ Creating branch from $BASE"
git fetch "$AZDO_REMOTE" "$BASE"
git checkout -b "$BRANCH" "$AZDO_REMOTE/$BASE"

echo ""
echo "▶ Introducing vulnerable dependency..."
# express@4.17.1 — CVE-2022-24999 (CVSS 7.5, open redirect)
# Not a current frogstatus dependency, so Frogbot always sees it as a new issue.
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
echo "▶ Pushing branch to AzDO..."
git push -u "$AZDO_REMOTE" "$BRANCH"

echo ""
echo "▶ Creating pull request..."
PR_URL=$(az repos pr create \
  --repository "$AZDO_REPO" \
  --source-branch "$BRANCH" \
  --target-branch "$BASE" \
  --title "feat: add express for local API endpoint" \
  --description "## Summary

Adding express to expose build metrics via a local HTTP endpoint for integration with the monitoring dashboard.

## Changes

- Added \`express\` dependency to \`package.json\`

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass" \
  --query "url" \
  --output tsv)

echo ""
echo "▶ Done! Frogbot will scan the PR shortly."
echo "   PR URL: $PR_URL"
echo ""
echo "   To clean up after the demo, run:"
echo "   ./scripts/demo-cleanup-pr-azdo.sh"

# Restore working branch tracking azdo/main
git checkout main
git pull --rebase "$AZDO_REMOTE" main
git branch -D "$BRANCH" 2>/dev/null || true
git checkout -b "$BRANCH" --track "$AZDO_REMOTE/main"
