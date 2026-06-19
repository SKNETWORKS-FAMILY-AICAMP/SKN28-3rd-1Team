#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required. Install GitHub CLI before running this script." >&2
  exit 1
fi

install_skill() {
  local repo="$1"
  local skill="$2"
  local target_dir="$3"

  if [[ -d "$target_dir" && "${FORCE:-0}" != "1" ]]; then
    echo "skip $skill: $target_dir already exists"
    return
  fi

  local flags=(--agent codex --scope project)
  if [[ "${FORCE:-0}" == "1" ]]; then
    flags+=(--force)
  fi

  gh skill install "$repo" "$skill" "${flags[@]}"
}

install_skill "dmno-dev/varlock" "varlock" ".agents/skills/varlock"
install_skill "figma/mcp-server-guide" "figma-use" ".agents/skills/figma-use"
install_skill "Infisical/ai-skills" "infisical-setup" ".agents/skills/infisical-setup"
install_skill "Infisical/ai-skills" "infisical-api" ".agents/skills/infisical-api"
