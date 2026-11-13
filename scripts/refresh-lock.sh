#!/bin/bash
# Refreshes package-lock.json to match the current package.json, WITHOUT resolving
# packages locally. The resolution runs on a clean GitHub runner (the "Generate Demo
# Lock Files" workflow), because locally the registry is redirected to an internal
# Artifactory instance that blocks the demo's vulnerable packages.
#
# Use after changing dependency versions in package.json (for example when Claude
# fixes vulnerabilities through the JFrog MCP server), before committing:
#
#   ./scripts/refresh-lock.sh
#   git add package.json package-lock.json && git commit
#
# Needs: gh authenticated, and the workflow already on the default branch.
# The package.json text is sent to the workflow as an input (it is not committed).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

WORKFLOW="generate-locks.yml"
ARTIFACT="demo-lock-current"

echo "▶ Dispatching $WORKFLOW with the current package.json..."
BEFORE=$(gh run list --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId // 0')
gh workflow run "$WORKFLOW" -f package_json="$(cat package.json)"

# Wait for the new run to appear.
RUN=""
for _ in $(seq 1 30); do
  sleep 2
  LATEST=$(gh run list --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId // 0')
  if [[ "$LATEST" != "$BEFORE" ]]; then RUN="$LATEST"; break; fi
done
if [[ -z "$RUN" ]]; then
  echo "Error: the workflow run did not start." >&2
  exit 1
fi

echo "▶ Waiting for run $RUN (https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/actions/runs/$RUN)..."
gh run watch "$RUN" --exit-status > /dev/null || {
  echo "Error: the workflow failed. See: gh run view $RUN --log-failed" >&2
  exit 1
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh run download "$RUN" -n "$ARTIFACT" -D "$TMP"
cp "$TMP/package-lock.json" package-lock.json

echo "✓ Updated package-lock.json from run $RUN"
echo "  Commit it together with package.json."
