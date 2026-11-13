#!/bin/bash
# Creates a demo PR introducing a vulnerable dependency to trigger Frogbot.
#
# Besides the vulnerable dependency, the PR also carries seeded secrets, SAST and
# IaC issues (see scripts/demo-seed.sh). Pass --sca-only to leave those out.
#
# Usage: ./scripts/demo-create-pr.sh <platform> [--sca-only]
#   platform: github | azdo

set -e

PLATFORM=""
SEEDS=true
for arg in "$@"; do
  case "$arg" in
    github|azdo) PLATFORM="$arg" ;;
    --sca-only) SEEDS=false ;;
  esac
done

if [[ -z "$PLATFORM" ]]; then
  echo "Usage: demo-create-pr.sh <platform> [--sca-only]" >&2
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

# If anything below fails (for example a blocked push), return to main and
# discard the local demo branch so the next run starts clean.
cleanup_on_failure() {
  local status=$?
  if [[ $status -ne 0 && "$(git symbolic-ref --short HEAD 2>/dev/null)" == "$BRANCH" ]]; then
    echo "" >&2
    echo "Script failed (exit $status). Returning to main and discarding local branch $BRANCH." >&2
    git checkout main -q
    git branch -D "$BRANCH" -q 2>/dev/null || true
    "$SCRIPT_DIR/demo-seed.sh" remove >/dev/null 2>&1 || true
  fi
}
trap cleanup_on_failure EXIT

# Introduce vulnerable dependency
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.dependencies['express'] = '4.17.1';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
# Use the canned lock for this state (generated on a clean runner, see CLAUDE.md)
# so Frogbot's static SCA sees express and its transitive dependencies.
cp "$SCRIPT_DIR/locks/vulnerable-express.json" package-lock.json
git add package.json package-lock.json
git commit -m "feat: add express for local API endpoint

Adding express to expose build metrics via a local HTTP endpoint
for integration with the monitoring dashboard." -q

SEED_NOTE=""
if [[ "$SEEDS" == true ]]; then
  # Second commit: health endpoints, a publish helper and infrastructure config.
  # Any uncommitted local seeds are committed here and leave the working tree
  # when we switch back to main.
  "$SCRIPT_DIR/demo-seed.sh" apply
  # shellcheck disable=SC2046
  git add $("$SCRIPT_DIR/demo-seed.sh" list)
  git commit -m "feat: add health endpoints, publish helper and infrastructure config

Adds a diagnostics API, a helper for publishing build status, a Terraform
module for the artefact store and a Dockerfile for the debug image." -q
  SEED_NOTE="
- Added health endpoints in \`src/health.js\`, a publish helper in \`src/publish.js\`
- Added Terraform in \`infra/terraform\` and a Dockerfile in \`infra/docker\`"
fi

# Pushing may be blocked by GitHub push protection if the seeded token is
# recognised. Show the real error rather than hiding it.
git push -u "$REMOTE" "$BRANCH" -q

# Create PR — outputs PR URL
if [[ "$PLATFORM" == "github" ]]; then
  gh pr create \
    --base "$BASE" \
    --head "$BRANCH" \
    --title "feat: add express for local API endpoint" \
    --body "Adding express to expose build metrics via a local HTTP endpoint.

- Added \`express\` dependency to \`package.json\`$SEED_NOTE"
elif [[ "$PLATFORM" == "azdo" ]]; then
  az repos pr create \
    --repository "$AZDO_REPO" \
    --source-branch "$BRANCH" \
    --target-branch "$BASE" \
    --title "feat: add express for local API endpoint" \
    --description "## Summary

Adding express to expose build metrics via a local HTTP endpoint.

- Added \`express\` dependency to \`package.json\`$SEED_NOTE" \
    --query "url" \
    --output tsv
fi

git checkout main -q
git branch -D "$BRANCH" 2>/dev/null || true
