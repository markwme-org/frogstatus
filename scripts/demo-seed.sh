#!/bin/bash
# Applies or removes the deliberately vulnerable "seed" files used to demonstrate
# secrets, SAST and IaC detection.
#
# Usage: ./scripts/demo-seed.sh <command>
#   apply   copy seed files into the working tree (uncommitted)
#   remove  delete seed files from the working tree
#   list    print the seed destination paths, one per line
#   status  show which seed files are present
#
# Local scenario: run "apply" on main, leave the files uncommitted, then show the
# IDE extension and "jf audit" finding them before anything is committed.
# PR scenario: demo-create-pr.sh calls "apply" on the PR branch and commits them.
#
# Seed templates live in scripts/demo-seeds/files as <path>.seed. The scanners
# ignore the .seed suffix, so nothing is flagged until a seed is applied.
# The revoked GitHub PAT and dummy DB password are read from
# ~/.config/frogstatus-demo/secrets (outside the repo) or from the environment.
# See scripts/demo-seeds/secrets.example. Override the path with $DEMO_SECRETS_FILE.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEED_DIR="$SCRIPT_DIR/demo-seeds/files"
SECRETS_FILE="${DEMO_SECRETS_FILE:-$HOME/.config/frogstatus-demo/secrets}"

cd "$REPO_ROOT"

# Print each seed's destination path relative to the repo root.
seed_paths() {
  (cd "$SEED_DIR" && find . -type f -name '*.seed' | sed 's|^\./||; s|\.seed$||' | sort)
}

load_secret() {
  local name="$1"
  if [[ -z "${!name:-}" && -f "$SECRETS_FILE" ]]; then
    printf -v "$name" '%s' "$(sed -n "s/^$name=//p" "$SECRETS_FILE" | head -n1)"
  fi
  if [[ -z "${!name:-}" ]]; then
    echo "Error: $name not set. Export it or add it to $SECRETS_FILE (see scripts/demo-seeds/secrets.example)." >&2
    exit 1
  fi
}

load_secrets() {
  load_secret DEMO_GITHUB_TOKEN
  load_secret DEMO_DB_PASSWORD
}

is_tracked() {
  git ls-files --error-unmatch -- "$1" >/dev/null 2>&1
}

cmd_apply() {
  load_secrets
  local dest
  while IFS= read -r dest; do
    if is_tracked "$dest"; then
      echo "  skip    $dest (already tracked by git)"
      continue
    fi
    mkdir -p "$(dirname "$dest")"
    sed -e "s|__DEMO_GITHUB_TOKEN__|$DEMO_GITHUB_TOKEN|g" \
        -e "s|__DEMO_DB_PASSWORD__|$DEMO_DB_PASSWORD|g" \
        "$SEED_DIR/$dest.seed" > "$dest"
    echo "  applied $dest"
  done < <(seed_paths)
}

cmd_remove() {
  local dest
  while IFS= read -r dest; do
    if is_tracked "$dest"; then
      echo "  skip    $dest (tracked by git, not removing)"
      continue
    fi
    if [[ -f "$dest" ]]; then
      rm -f "$dest"
      echo "  removed $dest"
      # Tidy up directories this script created, if they are now empty.
      rmdir "$(dirname "$dest")" 2>/dev/null || true
    fi
  done < <(seed_paths)
}

cmd_status() {
  local dest
  while IFS= read -r dest; do
    if [[ -f "$dest" ]]; then echo "  present $dest"; else echo "  absent  $dest"; fi
  done < <(seed_paths)
}

case "${1:-}" in
  apply)  cmd_apply ;;
  remove) cmd_remove ;;
  list)   seed_paths ;;
  status) cmd_status ;;
  *)
    echo "Usage: demo-seed.sh <apply|remove|list|status>" >&2
    exit 1
    ;;
esac
