#!/bin/bash
# Creates a demo PR introducing a vulnerable dependency to trigger Frogbot.
#
# Usage: ./scripts/demo-create-pr.sh <platform>
#   platform: github | azdo

set -e

PLATFORM=""
for arg in "$@"; do
  case "$arg" in
    github|azdo) PLATFORM="$arg" ;;
  esac
done

if [[ -z "$PLATFORM" ]]; then
  echo "Usage: demo-create-pr.sh <platform>" >&2
  echo "  platform: github | azdo" >&2
  exit 1
fi

BRANCH="demo/vulnerable-dependency"
BASE="main"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

case "$PLATFORM" in
  github) REMOTE="origin" ;;
  azdo)   REMOTE="azdo" ;;
esac

# Configure AzDO CLI defaults
if [[ "$PLATFORM" == "azdo" ]]; then
  REMOTE_URL=$(git remote get-url "$REMOTE")
  AZDO_ORG=$(echo "$REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f1)
  AZDO_PROJECT=$(echo "$REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f2)
  AZDO_REPO=$(echo "$REMOTE_URL" | sed 's|https://dev.azure.com/||' | cut -d'/' -f4)
  az devops configure --defaults organization="https://dev.azure.com/$AZDO_ORG" project="$AZDO_PROJECT" 2>/dev/null
fi

# Clean up any existing demo PR and branch
if [[ "$PLATFORM" == "github" ]]; then
  gh pr close "$BRANCH" --delete-branch 2>/dev/null || true
elif [[ "$PLATFORM" == "azdo" ]]; then
  EXISTING_PR=$(az repos pr list \
    --repository "$AZDO_REPO" \
    --source-branch "$BRANCH" \
    --status active \
    --query "[0].pullRequestId" \
    --output tsv 2>/dev/null || true)
  if [[ -n "$EXISTING_PR" && "$EXISTING_PR" != "None" ]]; then
    az repos pr update --id "$EXISTING_PR" --status abandoned --output none
  fi
fi

git push "$REMOTE" --delete "$BRANCH" 2>/dev/null || true
[[ "$(git symbolic-ref --short HEAD)" == "$BRANCH" ]] && git checkout main -q
git branch -D "$BRANCH" 2>/dev/null || true

# Create branch from remote main
git fetch "$REMOTE" "$BASE" -q
git checkout -b "$BRANCH" "$REMOTE/$BASE" -q

# Introduce vulnerable dependency
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.dependencies['express'] = '4.17.1';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
git add package.json
git commit -m "feat: add express for local API endpoint

Adding express to expose build metrics via a local HTTP endpoint
for integration with the monitoring dashboard." -q

git push -u "$REMOTE" "$BRANCH" -q 2>/dev/null

# Create PR — outputs PR URL
if [[ "$PLATFORM" == "github" ]]; then
  gh pr create \
    --base "$BASE" \
    --head "$BRANCH" \
    --title "feat: add express for local API endpoint" \
    --body "Adding express to expose build metrics via a local HTTP endpoint.

- Added \`express\` dependency to \`package.json\`"
elif [[ "$PLATFORM" == "azdo" ]]; then
  az repos pr create \
    --repository "$AZDO_REPO" \
    --source-branch "$BRANCH" \
    --target-branch "$BASE" \
    --title "feat: add express for local API endpoint" \
    --description "## Summary

Adding express to expose build metrics via a local HTTP endpoint.

- Added \`express\` dependency to \`package.json\`" \
    --query "url" \
    --output tsv
fi

git checkout main -q
git branch -D "$BRANCH" 2>/dev/null || true
