#!/bin/bash
# Closes the Frogbot demo PR in Azure DevOps and cleans up the branch,
# leaving the repo ready for the next demo run.
#
# Requires: az CLI with azure-devops extension
#
# Usage: ./scripts/demo-cleanup-pr-azdo.sh

set -e

BRANCH="demo/vulnerable-dependency"
AZDO_REMOTE="azdo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

AZDO_REMOTE_URL=$(git remote get-url "$AZDO_REMOTE")
AZDO_ORG=$(echo "$AZDO_REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f1)
AZDO_PROJECT=$(echo "$AZDO_REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f2)
AZDO_REPO=$(echo "$AZDO_REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f4)
AZDO_ORG_URL="https://dev.azure.com/$AZDO_ORG"

az devops configure --defaults organization="$AZDO_ORG_URL" project="$AZDO_PROJECT" 2>/dev/null

echo "▶ Abandoning demo PR (if active)..."
DEMO_PR=$(az repos pr list \
  --repository "$AZDO_REPO" \
  --source-branch "$BRANCH" \
  --status active \
  --query "[0].pullRequestId" \
  --output tsv 2>/dev/null || true)
if [ -n "$DEMO_PR" ] && [ "$DEMO_PR" != "None" ]; then
  az repos pr update --id "$DEMO_PR" --status abandoned --output none
  echo "  PR #$DEMO_PR abandoned"
else
  echo "  No active PR found"
fi

echo ""
echo "▶ Deleting remote branch..."
git push "$AZDO_REMOTE" --delete "$BRANCH" 2>/dev/null && echo "  Remote branch deleted" || echo "  Remote branch not found"

echo ""
echo "▶ Abandoning Frogbot fix PRs (if any)..."
az repos pr list \
  --repository "$AZDO_REPO" \
  --status active \
  --query "[?contains(sourceRefName, 'frogbot')].pullRequestId" \
  --output tsv 2>/dev/null | while read -r pr_id; do
    if [ -n "$pr_id" ]; then
      az repos pr update --id "$pr_id" --status abandoned --output none
      echo "  Abandoned Frogbot PR #$pr_id"
    fi
  done

echo ""
echo "▶ Done. Ready for next demo run."
