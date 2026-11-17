#!/bin/bash
# Removes the MCP server installed during the Agent Guard part of the demo, so the
# demo starts from "not installed" again.
#
# Clears, for the project:
#   - the entry in .mcp.json (the file is deleted if that was its only server)
#   - its approval in .claude/settings.local.json (enabled/disabledMcpjsonServers)
#   - its cached OAuth token key in ~/.jfrog/jfrogmcp.conf.json, if there is one
#     (the cache holds secrets: it is edited by key only and never printed)
#
# It does NOT touch the JFrog side. The server stays on the project's approved list
# in the AI Catalogue, so "install the Microsoft Learn MCP server" is allowed again.
#
# Run it BEFORE launching Claude Code. A running session keeps the server loaded
# until you /exit.
#
# Usage: ./scripts/demo-reset-mcp.sh [--check]
#   --check  show what would change, change nothing
#
# Override the server with DEMO_MCP_NAME. DEMO_MCP_ROOT and DEMO_MCP_CACHE point the
# script at another directory/cache file (used for testing).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${DEMO_MCP_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
NAME="${DEMO_MCP_NAME:-com.microsoft/microsoft-learn-mcp}"
CACHE="${DEMO_MCP_CACHE:-$HOME/.jfrog/jfrogmcp.conf.json}"
MCP_JSON="$ROOT/.mcp.json"
SETTINGS="$ROOT/.claude/settings.local.json"

CHECK=false
[[ "${1:-}" == "--check" ]] && CHECK=true

command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }

changed=false
note() { echo "  $1"; changed=true; }

# Rewrites a JSON file with a jq filter, via a temp file so a jq failure cannot truncate it.
rewrite() {
  local file="$1" filter="$2" tmp
  tmp="$(mktemp)"
  jq --arg n "$NAME" "$filter" "$file" > "$tmp"
  cp "$tmp" "$file"
  rm -f "$tmp"
}

# 1. .mcp.json
if [[ -f "$MCP_JSON" ]] && jq -e --arg n "$NAME" '.mcpServers[$n]' "$MCP_JSON" >/dev/null 2>&1; then
  if [[ "$CHECK" == true ]]; then
    note "would remove '$NAME' from .mcp.json"
  else
    rewrite "$MCP_JSON" 'del(.mcpServers[$n])'
    if jq -e '(.mcpServers // {}) | length == 0' "$MCP_JSON" >/dev/null; then
      rm -f "$MCP_JSON"
      note "removed '$NAME' and deleted the now-empty .mcp.json"
    else
      note "removed '$NAME' from .mcp.json"
    fi
  fi
fi

# 2. Approval state in the project's local settings
if [[ -f "$SETTINGS" ]] && jq -e --arg n "$NAME" \
     '((.enabledMcpjsonServers // []) + (.disabledMcpjsonServers // [])) | index($n)' "$SETTINGS" >/dev/null 2>&1; then
  if [[ "$CHECK" == true ]]; then
    note "would clear the approval for '$NAME' in .claude/settings.local.json"
  else
    rewrite "$SETTINGS" '
      (if has("enabledMcpjsonServers") then .enabledMcpjsonServers |= map(select(. != $n)) else . end)
      | (if has("disabledMcpjsonServers") then .disabledMcpjsonServers |= map(select(. != $n)) else . end)
      | (if (.enabledMcpjsonServers // [1]) == [] then del(.enabledMcpjsonServers) else . end)
      | (if (.disabledMcpjsonServers // [1]) == [] then del(.disabledMcpjsonServers) else . end)'
    note "cleared the approval for '$NAME' in .claude/settings.local.json"
  fi
fi

# 3. Cached OAuth token (key only; values are never read or printed)
if [[ -f "$CACHE" ]] && jq -e --arg n "$NAME" '.servers[$n] != null' "$CACHE" >/dev/null 2>&1; then
  if [[ "$CHECK" == true ]]; then
    note "would delete the cached OAuth key for '$NAME'"
  else
    rewrite "$CACHE" 'del(.servers[$n])'
    note "deleted the cached OAuth key for '$NAME'"
  fi
fi

if [[ "$changed" == false ]]; then
  echo "MCP server '$NAME' is not installed. Nothing to do."
elif [[ "$CHECK" == false ]]; then
  echo "Done. If Claude Code is running in this directory, /exit and relaunch it."
fi
