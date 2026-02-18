#!/bin/bash
# Shared config for all demo scripts
BASE_URL="http://localhost:3000"
API_KEY="demo"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

header() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

info() {
  echo -e "${DIM}$1${NC}"
}

success() {
  echo -e "${GREEN}$1${NC}"
}

warn() {
  echo -e "${YELLOW}$1${NC}"
}

show_system_prompt() {
  echo -e "${MAGENTA}${BOLD}System Prompt:${NC}"
  echo -e "${MAGENTA}$1${NC}"
  echo ""
}

show_user_prompt() {
  echo -e "${CYAN}${BOLD}User Prompt:${NC}"
  echo -e "${CYAN}$1${NC}"
  echo ""
}
