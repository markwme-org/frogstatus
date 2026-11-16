#!/bin/bash
# Puts the repo into the correct state for the start of a demo.
# Run this before the audience arrives.
#
# Usage: ./scripts/demo-setup.sh <platform> [--no-push]
#   platform: github | azdo | all

set -e

PLATFORM=""
PUSH=true

for arg in "$@"; do
  case "$arg" in
    github|azdo|all) PLATFORM="$arg" ;;
    --no-push) PUSH=false ;;
  esac
done

if [[ -z "$PLATFORM" ]]; then
  echo "Usage: demo-setup.sh <platform> [--no-push]" >&2
  echo "  platform: github | azdo | all" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if [[ "$(git symbolic-ref --short HEAD 2>/dev/null)" != "main" ]]; then
  echo "Error: must be on the main branch." >&2
  exit 1
fi

# Remove any leftover PR-set seeds (untracked) from a previous run.
"$SCRIPT_DIR/demo-seed.sh" remove pr > /dev/null

# Switch to the vulnerable state. This also copies the canned lock file from
# scripts/locks, so no packages are resolved locally.
npm run set-vulnerable:no-install > /dev/null

# Commit if there are changes
git add package.json package-lock.json
git diff --cached --quiet || git commit -m "demo: switch to vulnerable dependencies" -q

# Baseline secrets, SAST and IaC issues live on main. CI builds them, Frogbot and the
# IDE/CLI find them, and they stay as unfixed findings after the dependencies are
# fixed. The PR scenario adds a different set (see demo-create-pr.sh).
"$SCRIPT_DIR/demo-seed.sh" apply main > /dev/null
# shellcheck disable=SC2046
git add $("$SCRIPT_DIR/demo-seed.sh" list main)
git diff --cached --quiet || git commit -m "demo: add baseline secrets, SAST and IaC issues" -q

# Sync and push to a remote, and run its cleanup script
setup_platform() {
  local remote="$1"
  local cleanup="$2"

  "$SCRIPT_DIR/$cleanup" > /dev/null 2>&1 || true

  if [[ "$PUSH" == true ]] && git remote get-url "$remote" &>/dev/null; then
    git push "$remote" HEAD:main -q
  fi
}

case "$PLATFORM" in
  github) setup_platform "origin" "demo-cleanup-pr.sh" ;;
  azdo)   setup_platform "azdo"   "demo-cleanup-pr-azdo.sh" ;;
  all)
    setup_platform "origin" "demo-cleanup-pr.sh"
    setup_platform "azdo"   "demo-cleanup-pr-azdo.sh"
    ;;
esac
