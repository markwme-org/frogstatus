#!/bin/bash
# Local build + Xray scan script for iterating outside of CI.
#
# Mirrors the CI flow: jf npm install → build → publish build-info → build-scan
#
# NOTE: node_modules must be removed before running so that jf npm install
# actually fetches packages through Artifactory and records them in build-info.
# Use --skip-install only if you have already run this script once and want to
# re-publish/re-scan without reinstalling.
#
# Usage:
#   ./scripts/local-build-scan.sh [options]
#
# Options:
#   --build-name NAME     Build name (default: frogstatus-local)
#   --build-number NUM    Build number (default: timestamp)
#   --project KEY         JFrog project key (default: $JF_PROJECT or empty)
#   --npm-repo REPO       JFrog npm repository name (default: $JF_NPM_REPOSITORY)
#   --vuln                Also report all vulnerabilities (not just violations)
#   --skip-install        Skip removing node_modules and npm install
#   --skip-build          Skip npm build
#   --help                Show this help

set -e

# ─── Defaults ────────────────────────────────────────────────────────────────
BUILD_NAME="frogstatus-local"
BUILD_NUMBER="$(date +%Y%m%d-%H%M%S)"
PROJECT="${JF_PROJECT:-}"
NPM_REPO="${JF_NPM_REPOSITORY:-}"
VULN_FLAG=""
SKIP_INSTALL=false
SKIP_BUILD=false

# ─── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --build-name)   BUILD_NAME="$2";   shift 2 ;;
    --build-number) BUILD_NUMBER="$2"; shift 2 ;;
    --project)      PROJECT="$2";      shift 2 ;;
    --npm-repo)     NPM_REPO="$2";     shift 2 ;;
    --vuln)         VULN_FLAG="--vuln"; shift ;;
    --skip-install) SKIP_INSTALL=true;  shift ;;
    --skip-build)   SKIP_BUILD=true;    shift ;;
    --help)
      sed -n '/^# Usage:/,/^[^#]/p' "$0" | head -n -1 | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Validation ──────────────────────────────────────────────────────────────
if [[ -z "$NPM_REPO" ]]; then
  echo "ERROR: JFrog npm repository not set. Use --npm-repo or set JF_NPM_REPOSITORY."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ─── Export build name/number so all jf commands pick them up ─────────────────
export JFROG_CLI_BUILD_NAME="$BUILD_NAME"
export JFROG_CLI_BUILD_NUMBER="$BUILD_NUMBER"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  FrogStatus Local Build + Xray Scan                     ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Build name:   $BUILD_NAME"
echo "║  Build number: $BUILD_NUMBER"
echo "║  Project:      ${PROJECT:-(none - root level)}"
echo "║  npm repo:     $NPM_REPO"
echo "║  --vuln:       ${VULN_FLAG:-(not set)}"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Configure npm to resolve through JFrog ──────────────────────────
echo "▶ Configuring jf npm to resolve from: $NPM_REPO"
jf npmc --global=false --repo-resolve="$NPM_REPO"
echo ""

# ─── Step 2: Clean and install dependencies ───────────────────────────────────
if [[ "$SKIP_INSTALL" == false ]]; then
  echo "▶ Removing node_modules so packages are fetched fresh from Artifactory"
  rm -rf node_modules app-api/node_modules app-ui/node_modules
  echo ""

  echo "▶ Cleaning npm cache"
  jf npm cache clean --force
  echo ""

  echo "▶ Installing dependencies via jf npm install (recording build-info module)"
  jf npm install --module frogstatusmod
  echo ""
else
  echo "▶ Skipping npm install (--skip-install)"
  echo ""
fi

# Add dependencies from Artifactory using package-lock.json as the source of truth.
# Artifactory limits AQL to 6000 chars so the generator splits into batches of ~100.
echo "▶ Adding dependencies from Artifactory (package-lock.json → batched AQL)"
DEPS_DIR="$(mktemp -d /tmp/frogstatus-deps-XXXX)"
node "$(dirname "$0")/gen-build-deps-spec.js" "$NPM_REPO" "$DEPS_DIR"
BATCH_COUNT=0
for spec in "$DEPS_DIR"/deps-spec-*.json; do
  BATCH_COUNT=$((BATCH_COUNT + 1))
  echo "   Batch $BATCH_COUNT: $spec"
  jf rt build-add-dependencies \
    --from-rt \
    --module frogstatusmod \
    ${PROJECT:+--project "$PROJECT"} \
    --spec "$spec"
done
rm -rf "$DEPS_DIR"
echo ""

# ─── Step 3: Build ───────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  echo "▶ Building application"
  npm run build
  echo ""
else
  echo "▶ Skipping build (--skip-build)"
  echo ""
fi

# ─── Step 4: Publish build info ──────────────────────────────────────────────
echo "▶ Collecting and publishing build info"
jf rt build-collect-env
jf rt build-add-git
if [[ -n "$PROJECT" ]]; then
  jf rt build-publish --project "$PROJECT"
else
  jf rt build-publish
fi
echo ""

# ─── Step 5: Build scan ───────────────────────────────────────────────────────
BUILD_SCAN_ARGS=()
[[ -n "$PROJECT" ]]   && BUILD_SCAN_ARGS+=(--project "$PROJECT")
[[ -n "$VULN_FLAG" ]] && BUILD_SCAN_ARGS+=("$VULN_FLAG")

echo "▶ Running Xray build scan"
echo "   jf build-scan ${BUILD_SCAN_ARGS[*]}"
echo ""

# Capture exit code without failing the script
set +e
jf build-scan "${BUILD_SCAN_ARGS[@]}"
SCAN_EXIT=$?
set -e

echo ""
echo "▶ build-scan exit code: $SCAN_EXIT"
echo "  (2 = violations found, 3 = vulnerabilities found, 0 = clean)"
echo ""
echo "▶ Build published as: $BUILD_NAME / $BUILD_NUMBER"
echo "  Xray UI: Scans List → Builds → $BUILD_NAME"
