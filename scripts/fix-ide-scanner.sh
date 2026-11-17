#!/bin/bash
# Fixes the JFrog VS Code extension's scanner on Apple Silicon Macs.
#
# Symptom (extension output):
#   AnalyzerManager run contextual-analysis ... ended with error
#   (scan log: "ImportError: failed to find libmagic")
#
# Cause: the extension's analyzer package mixes architectures. Its jas_scanner is
# x86_64 (runs under Rosetta) but loads libmagic.dylib from the JFrog CLI's folder,
# ~/.jfrog/dependencies/analyzerManager/jas_scanner/_internal/, where the copy is
# arm64-only. An x86_64 process cannot load an arm64 library.
#
# Fix: make that libmagic.dylib a universal binary: the CLI's own arm64 slice plus
# the extension's x86_64 slice. The CLI keeps working and the extension scanner
# can load it. Re-run this script if a CLI update overwrites the file.
#
# Usage: ./scripts/fix-ide-scanner.sh [--check | --restore]
#   (no flag)  apply the fix if it is needed
#   --check    report whether the fix is needed (exit 1 if it is)
#   --restore  put the original arm64-only file back

set -e

CLI_LIB="$HOME/.jfrog/dependencies/analyzerManager/jas_scanner/_internal/libmagic.dylib"
EXT_LIB="$HOME/.jfrog-vscode-extension/issues/analyzerManager/jas_scanner/_internal/libmagic.dylib"
BACKUP="$CLI_LIB.arm64-original"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This fix is only for macOS." >&2
  exit 1
fi

for f in "$CLI_LIB" "$EXT_LIB"; do
  if [[ ! -f "$f" ]]; then
    echo "Not found: $f" >&2
    echo "Run a scan in the extension and a 'jf audit' once so both downloads exist, then retry." >&2
    exit 1
  fi
done

has_slice() { lipo -archs "$1" 2>/dev/null | tr ' ' '\n' | grep -qx "$2"; }

case "${1:-}" in
  --check)
    if has_slice "$CLI_LIB" x86_64 && has_slice "$CLI_LIB" arm64; then
      echo "OK: $CLI_LIB already has both slices."
    else
      echo "Fix needed: $CLI_LIB has only: $(lipo -archs "$CLI_LIB")"
      exit 1
    fi
    ;;

  --restore)
    if [[ ! -f "$BACKUP" ]]; then
      echo "No backup at $BACKUP, nothing to restore." >&2
      exit 1
    fi
    cp "$BACKUP" "$CLI_LIB"
    echo "Restored the original arm64-only file."
    ;;

  "")
    if has_slice "$CLI_LIB" x86_64 && has_slice "$CLI_LIB" arm64; then
      echo "Already fixed: $CLI_LIB has both slices."
      exit 0
    fi
    has_slice "$CLI_LIB" arm64 || { echo "Unexpected: CLI libmagic has no arm64 slice ($(lipo -archs "$CLI_LIB"))." >&2; exit 1; }
    has_slice "$EXT_LIB" x86_64 || { echo "Unexpected: extension libmagic has no x86_64 slice ($(lipo -archs "$EXT_LIB"))." >&2; exit 1; }

    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT

    # Back up the current arm64 file. Refresh the backup if a CLI update replaced it.
    cp "$CLI_LIB" "$BACKUP"
    lipo -thin x86_64 "$EXT_LIB" -output "$TMP/x86_64.dylib"
    lipo -create "$BACKUP" "$TMP/x86_64.dylib" -output "$TMP/universal.dylib"
    cp "$TMP/universal.dylib" "$CLI_LIB"
    codesign --force -s - "$CLI_LIB" 2>/dev/null

    echo "Fixed: $CLI_LIB now has: $(lipo -archs "$CLI_LIB")"
    echo "Original saved as $BACKUP"
    echo "Re-run the scan in VS Code. Undo with: $0 --restore"
    ;;

  *)
    echo "Usage: $0 [--check | --restore]" >&2
    exit 1
    ;;
esac
