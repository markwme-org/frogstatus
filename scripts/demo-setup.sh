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

# Switch to vulnerable state and install
npm run set-vulnerable:no-install > /dev/null 2>&1
npm install --registry https://registry.npmjs.org --silent 2>/dev/null

# Commit if there are changes
git add package.json package-lock.json
git diff --cached --quiet || git commit -m "demo: switch to vulnerable dependencies" -q

# Sync and push to a remote, and run its cleanup script
setup_platform() {
  local remote="$1"
  local cleanup="$2"

  "$SCRIPT_DIR/$cleanup" > /dev/null 2>&1 || true

  if [[ "$PUSH" == true ]] && git remote get-url "$remote" &>/dev/null; then
    git pull --rebase "$remote" main -q 2>/dev/null
    git push "$remote" HEAD:main -q 2>/dev/null
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
