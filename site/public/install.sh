#!/usr/bin/env bash
set -euo pipefail

# Korvid installer — macOS / Linux
# https://korvid.ai

KORVID_VERSION="${KORVID_VERSION:-latest}"
INSTALL_DIR="${KORVID_DIR:-$HOME/.korvid}"
NODE_MIN_VERSION=18

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
SHEEN='\033[0;94m'
NC='\033[0m'

info()  { printf "${SHEEN}●${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}●${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}●${NC} %s\n" "$1"; }
err()   { printf "${RED}✕${NC} %s\n" "$1"; exit 1; }

# ── Check Node.js ──────────────────────────────────────────────

check_node() {
  if command -v node &>/dev/null; then
    local version
    version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$version" -ge "$NODE_MIN_VERSION" ]; then
      ok "node.js $(node -v) found"
      return 0
    fi
  fi
  return 1
}

install_node() {
  info "installing node.js via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  nvm install 22
  nvm use 22
  ok "node.js $(node -v) installed"
}

# ── Check/install pnpm ─────────────────────────────────────────

check_pnpm() {
  if command -v pnpm &>/dev/null; then
    ok "pnpm $(pnpm -v) found"
    return 0
  fi
  return 1
}

install_pnpm() {
  info "installing pnpm..."
  corepack enable
  corepack prepare pnpm@latest --activate 2>/dev/null || npm install -g pnpm
  ok "pnpm $(pnpm -v) installed"
}

# ── Install Korvid CLI ─────────────────────────────────────────

install_korvid() {
  info "installing korvid cli..."
  npm install -g @korvid/cli 2>/dev/null || pnpm add -g @korvid/cli
  ok "korvid cli installed"
}

# ── Main ───────────────────────────────────────────────────────

main() {
  echo ""
  printf "${SHEEN}korvid${NC} installer\n"
  echo ""

  if ! check_node; then
    install_node
  fi

  if ! check_pnpm; then
    install_pnpm
  fi

  install_korvid

  echo ""
  ok "done. run 'korvid init' to set up your assistant."
  echo ""
}

main "$@"
