#!/bin/bash

# ============================================================================
# Claude Prime - Shell Installer (fallback)
# ============================================================================
# Primary install method: npx claude-prime init
# Fallback:  bash <(curl -fsSL https://raw.githubusercontent.com/avibebuilder/claude-prime/main/install.sh)
#
# Installs .claude/ directory into the current working directory.
#
# Environment variables:
#   CLAUDE_PRIME_VERSION    Install a specific version (default: latest)
# ============================================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── Configuration ────────────────────────────────────────────────────────────
REPO="avibebuilder/claude-prime"
GITHUB_API="https://api.github.com/repos/${REPO}"
INSTALL_DIR="$(pwd)"

# ── Helpers ──────────────────────────────────────────────────────────────────

info()  { echo -e "  ${BLUE}→${NC} $1"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; }
abort() { echo -e "\n${RED}Error: $1${NC}" >&2; exit 1; }

banner() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            Claude Prime - Installer                           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ── Preflight checks ────────────────────────────────────────────────────────

check_dependencies() {
    local missing=()

    for cmd in curl unzip; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        abort "Missing required commands: ${missing[*]}"
    fi
}

check_existing_installation() {
    local has_claude_dir=false
    local has_claude_md=false

    [ -d "${INSTALL_DIR}/.claude" ] && has_claude_dir=true
    [ -f "${INSTALL_DIR}/CLAUDE.md" ] && has_claude_md=true

    if [ "$has_claude_dir" = false ] && [ "$has_claude_md" = false ]; then
        return
    fi

    warn "Existing configuration detected:"
    [ "$has_claude_dir" = true ] && echo -e "    .claude/"
    [ "$has_claude_md" = true ] && echo -e "    CLAUDE.md"
    echo ""

    if [ ! -t 0 ]; then
        abort "Existing files found. Run interactively to choose backup/override, or remove them manually."
    fi

    echo -e "  What would you like to do?"
    echo -e "    ${BOLD}1.${NC} Backup existing files and continue (moves to .claude.bk / CLAUDE.md.bk)"
    echo -e "    ${BOLD}2.${NC} Override (removes existing files)"
    echo -e "    ${BOLD}3.${NC} Cancel"
    echo ""
    read -p "  Choose [1/2/3]: " choice

    case "$choice" in
        1)
            if [ "$has_claude_dir" = true ]; then
                rm -rf "${INSTALL_DIR}/.claude.bk"
                mv "${INSTALL_DIR}/.claude" "${INSTALL_DIR}/.claude.bk"
                ok "Backed up .claude/ → .claude.bk/"
            fi
            if [ "$has_claude_md" = true ]; then
                rm -f "${INSTALL_DIR}/CLAUDE.md.bk"
                mv "${INSTALL_DIR}/CLAUDE.md" "${INSTALL_DIR}/CLAUDE.md.bk"
                ok "Backed up CLAUDE.md → CLAUDE.md.bk"
            fi
            ;;
        2)
            if [ "$has_claude_dir" = true ]; then
                rm -rf "${INSTALL_DIR}/.claude"
                ok "Removed existing .claude/"
            fi
            if [ "$has_claude_md" = true ]; then
                rm -f "${INSTALL_DIR}/CLAUDE.md"
                ok "Removed existing CLAUDE.md"
            fi
            ;;
        *)
            echo ""
            echo -e "  ${YELLOW}Installation cancelled.${NC}"
            exit 0
            ;;
    esac
    echo ""
}

# ── Version resolution ───────────────────────────────────────────────────────

resolve_version() {
    local version="${CLAUDE_PRIME_VERSION:-}"

    if [ -n "$version" ]; then
        version="${version#v}"
        echo "$version"
        return
    fi

    info "Fetching latest version from GitHub..." >&2

    local response
    response=$(curl -fsSL "${GITHUB_API}/releases/latest" 2>/dev/null) || {
        abort "Failed to fetch latest release from GitHub.\n  Check your internet connection or set CLAUDE_PRIME_VERSION manually."
    }

    version=$(echo "$response" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

    if [ -z "$version" ]; then
        abort "Could not determine latest version from GitHub API response."
    fi

    version="${version#v}"
    echo "$version"
}

# ── Download & install ───────────────────────────────────────────────────────

download_and_install() {
    local version="$1"
    local tag="v${version}"
    local asset_url="https://github.com/${REPO}/releases/download/${tag}/claude-prime.zip"

    TMPDIR=$(mktemp -d)
    trap 'rm -rf "$TMPDIR"' EXIT

    info "Downloading claude-prime ${tag}..."

    curl -fsSL "$asset_url" -o "${TMPDIR}/claude-prime.zip" || {
        abort "Failed to download release asset for ${tag}.\n  URL: ${asset_url}\n  Make sure this version has a release with the claude-prime.zip asset."
    }

    ok "Downloaded ${tag}"

    info "Extracting..."

    unzip -qo "${TMPDIR}/claude-prime.zip" -d "${INSTALL_DIR}" || {
        abort "Failed to extract claude-prime.zip"
    }

    ok "Installed .claude/ into ${INSTALL_DIR}"

    echo "$version" > "${INSTALL_DIR}/.claude/.prime-version"
}

# ── Post-install ─────────────────────────────────────────────────────────────

run_init() {
    local init_script="${INSTALL_DIR}/.claude/init.sh"

    if [ -f "$init_script" ]; then
        echo ""
        info "Running project initialization..."
        echo ""
        chmod +x "$init_script"
        bash "$init_script"
    fi
}

print_success() {
    local version="$1"

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Claude Prime installed successfully!             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Version:${NC}  ${version}"
    echo -e "  ${BOLD}Location:${NC} ${INSTALL_DIR}/.claude/"
    echo ""
    echo -e "  ${BOLD}Next steps:${NC}"
    echo -e "    1. Start Claude Code:  ${BLUE}claude${NC}"
    echo -e "    2. Prime your project: ${BLUE}/optimus-prime${NC}"
    echo -e "    3. Start building:     ${BLUE}/cook Add user authentication${NC}"
    echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
    banner
    check_dependencies
    check_existing_installation

    echo -e "${YELLOW}[1/2] Resolving version...${NC}"
    local version
    version=$(resolve_version)
    ok "Version: ${version}"
    echo ""

    echo -e "${YELLOW}[2/2] Downloading and installing...${NC}"
    download_and_install "$version"
    echo ""

    run_init
    print_success "$version"
}

main
