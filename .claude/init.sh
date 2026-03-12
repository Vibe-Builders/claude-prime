#!/bin/bash

# ============================================================================
# Claude Prime - Project Initialization Script
# ============================================================================
# This script sets up the project environment:
# 1. Appends entries to .gitignore (if not present)
# 2. Configures .mcp.json from example template
# 3. Sets up .env files for skills requiring API keys
# 4. Optionally installs agent-browser globally
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Claude Prime - Project Initialization                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. Update .gitignore
# ============================================================================
echo -e "${YELLOW}[1/4] Checking .gitignore...${NC}"

GITIGNORE_FILE="$PROJECT_ROOT/.gitignore"
GITIGNORE_ENTRIES=(
    "repomix-output.xml"
    "plans/**/*"
    "!plans/templates/*"
    "screenshots/*"
    "docs/screenshots/*"
    "docs/assets/*"
    "docs/research/*"
    "docs/session-reports/*"
    "claude-prime-*.zip",
    ".mcp.json"
)

if [ -f "$GITIGNORE_FILE" ]; then
    entries_added=0
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
        if ! grep -qxF "$entry" "$GITIGNORE_FILE" 2>/dev/null; then
            echo "$entry" >> "$GITIGNORE_FILE"
            echo -e "  ${GREEN}✓${NC} Added: $entry"
            ((entries_added++))
        fi
    done

    if [ $entries_added -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} All entries already present in .gitignore"
    else
        echo -e "  ${GREEN}✓${NC} Added $entries_added entries to .gitignore"
    fi
else
    echo -e "  ${YELLOW}Creating .gitignore...${NC}"
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
        echo "$entry" >> "$GITIGNORE_FILE"
    done
    echo -e "  ${GREEN}✓${NC} Created .gitignore with ${#GITIGNORE_ENTRIES[@]} entries"
fi

# Update .claude/.gitignore
CLAUDE_GITIGNORE_FILE="$SCRIPT_DIR/.gitignore"
CLAUDE_GITIGNORE_ENTRIES=(
    "touch-skill"
    "optimus-prime"
    "convo-analysis"
    "prime-sync"
)

if [ -f "$CLAUDE_GITIGNORE_FILE" ]; then
    claude_entries_added=0
    # Add newline only if file doesn't already end with one
    if [ -s "$CLAUDE_GITIGNORE_FILE" ] && [ "$(tail -c 1 "$CLAUDE_GITIGNORE_FILE")" != "" ]; then
        echo "" >> "$CLAUDE_GITIGNORE_FILE"
    fi
    for entry in "${CLAUDE_GITIGNORE_ENTRIES[@]}"; do
        if ! grep -qxF "$entry" "$CLAUDE_GITIGNORE_FILE" 2>/dev/null; then
            echo "$entry" >> "$CLAUDE_GITIGNORE_FILE"
            echo -e "  ${GREEN}✓${NC} Added to .claude/.gitignore: $entry"
            ((claude_entries_added++))
        fi
    done

    if [ $claude_entries_added -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} All entries already present in .claude/.gitignore"
    else
        echo -e "  ${GREEN}✓${NC} Added $claude_entries_added entries to .claude/.gitignore"
    fi
else
    echo -e "  ${YELLOW}Creating .claude/.gitignore...${NC}"
    for entry in "${CLAUDE_GITIGNORE_ENTRIES[@]}"; do
        echo "$entry" >> "$CLAUDE_GITIGNORE_FILE"
    done
    echo -e "  ${GREEN}✓${NC} Created .claude/.gitignore with ${#CLAUDE_GITIGNORE_ENTRIES[@]} entries"
fi

echo ""

# ============================================================================
# 2. Configure Skill Environment Files
# ============================================================================
echo -e "${YELLOW}[2/4] Configuring skill environment files...${NC}"

# --- media-processor skill ---
MEDIA_PROCESSOR_DIR="$SCRIPT_DIR/skills/media-processor"
MEDIA_PROCESSOR_ENV_EXAMPLE="$MEDIA_PROCESSOR_DIR/.env.example"
MEDIA_PROCESSOR_ENV="$MEDIA_PROCESSOR_DIR/.env"

if [ -f "$MEDIA_PROCESSOR_ENV_EXAMPLE" ]; then
    echo ""
    echo -e "  ${BLUE}━━━ media-processor skill ━━━${NC}"

    configure_media_processor=false
    if [ -f "$MEDIA_PROCESSOR_ENV" ]; then
        echo -e "  ${YELLOW}⚠${NC}  .env already exists"
        read -p "  Overwrite existing configuration? (y/N): " overwrite_mp
        if [[ "$overwrite_mp" =~ ^[Yy]$ ]]; then
            configure_media_processor=true
        else
            echo -e "  ${BLUE}→${NC} Skipping media-processor configuration"
        fi
    else
        configure_media_processor=true
    fi

    if [ "$configure_media_processor" = true ]; then
        echo ""
        echo -e "  ${BLUE}Google Gemini API Configuration${NC}"
        echo -e "  Used by media-processor skill for audio/video/image processing."
        echo -e "  Get your API key: https://aistudio.google.com/apikey"
        echo ""
        read -p "  Enter Gemini API key (required): " gemini_api_key

        if [ -n "$gemini_api_key" ]; then
            sed "s/your_api_key_here/$gemini_api_key/" "$MEDIA_PROCESSOR_ENV_EXAMPLE" > "$MEDIA_PROCESSOR_ENV"
            echo -e "  ${GREEN}✓${NC} Created .env for media-processor skill"
            echo -e "  ${BLUE}→${NC} Stored at: ${BLUE}$MEDIA_PROCESSOR_ENV${NC}"
        else
            echo -e "  ${RED}✗${NC} Skipped - Gemini API key is required for this skill"
        fi
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  media-processor skill not found (skipping)"
fi

echo ""

# ============================================================================
# 3. Configure .mcp.json (MCP Servers)
# ============================================================================
echo -e "${YELLOW}[3/4] Configuring MCP servers...${NC}"

MCP_EXAMPLE="$SCRIPT_DIR/.mcp.json.example"
MCP_FILE="$PROJECT_ROOT/.mcp.json"

if [ -f "$MCP_EXAMPLE" ]; then
    if [ -f "$MCP_FILE" ]; then
        echo -e "  ${YELLOW}⚠${NC}  .mcp.json already exists"
        read -p "  Overwrite existing configuration? (y/N): " overwrite_mcp
        if [[ ! "$overwrite_mcp" =~ ^[Yy]$ ]]; then
            echo -e "  ${BLUE}→${NC} Skipping .mcp.json configuration"
        else
            configure_mcp=true
        fi
    else
        configure_mcp=true
    fi

    if [ "$configure_mcp" = true ]; then
        echo ""
        echo -e "  ${BLUE}Figma MCP Server Configuration (optional)${NC}"
        echo -e "  Only needed if you use Figma for design-to-code workflows."
        echo -e "  Get your API key: https://www.figma.com/developers/api#access-tokens"
        echo ""
        read -p "  Enter Figma API key (or press Enter to skip): " figma_api_key

        if [ -n "$figma_api_key" ]; then
            # Copy and replace the placeholder
            sed "s/YOUR-KEY/$figma_api_key/" "$MCP_EXAMPLE" > "$MCP_FILE"
            echo -e "  ${GREEN}✓${NC} Created .mcp.json with Figma API key"
            echo -e "  ${BLUE}→${NC} Stored at: ${BLUE}$MCP_FILE${NC}"
        else
            cp "$MCP_EXAMPLE" "$MCP_FILE"
            echo -e "  ${YELLOW}⚠${NC}  Created .mcp.json with placeholder (configure later)"
        fi
    fi
else
    echo -e "  ${RED}✗${NC} .mcp.json.example not found"
fi


echo ""

# ============================================================================
# 4. Install agent-browser (optional)
# ============================================================================
echo -e "${YELLOW}[4/4] Browser automation tool...${NC}"

if command -v agent-browser &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} agent-browser is already installed globally"
else
    echo ""
    echo -e "  ${BLUE}agent-browser${NC} enables browser automation for AI agents."
    echo -e "  It works via ${BLUE}npx agent-browser${NC} without installing, but global install is faster."
    echo ""
    read -p "  Install agent-browser globally? (y/N): " install_ab
    if [[ "$install_ab" =~ ^[Yy]$ ]]; then
        echo -e "  ${BLUE}→${NC} Installing agent-browser..."
        npm install -g agent-browser 2>&1 | tail -1
        echo -e "  ${BLUE}→${NC} Downloading Chromium..."
        agent-browser install 2>&1 | tail -1
        echo -e "  ${GREEN}✓${NC} agent-browser installed globally"
    else
        echo -e "  ${BLUE}→${NC} Skipped (use ${BLUE}npx agent-browser${NC} instead)"
    fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Initialization Complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Review generated configuration files"
echo -e "  2. Start using Claude Code with: ${BLUE}claude${NC}"
echo ""
