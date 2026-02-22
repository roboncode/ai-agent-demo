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

# Stream SSE events from an agent endpoint
stream_sse() {
  local url="$1"
  local data="$2"
  local current_event=""

  echo -e "${CYAN}--- Stream starts ---${NC}"
  echo ""

  curl -sN "$url" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$data" | while IFS= read -r line; do
    if [[ "$line" == event:* ]]; then
      current_event="${line#event: }"
    elif [[ "$line" == data:* ]]; then
      local json="${line#data: }"
      case "$current_event" in
        text-delta)
          printf "%s" "$(echo "$json" | jq -r '.text // empty')"
          ;;
        tool-call)
          local tool_name
          tool_name=$(echo "$json" | jq -r '.toolName')
          local args_summary
          args_summary=$(echo "$json" | jq -c '.args // {}')
          echo ""
          echo -e "${YELLOW}  > Tool Call: ${BOLD}${tool_name}${NC}${DIM} ${args_summary}${NC}"
          ;;
        tool-result)
          local result_tool
          result_tool=$(echo "$json" | jq -r '.toolName')
          # Show a compact preview of the result (first 120 chars)
          local result_preview
          result_preview=$(echo "$json" | jq -c '.result' | cut -c1-120)
          echo -e "${GREEN}  < Tool Result: ${BOLD}${result_tool}${NC}${DIM} ${result_preview}...${NC}"
          ;;
        status)
          echo -e "${YELLOW}  [$(echo "$json" | jq -r '.phase // empty')]${NC}"
          ;;
        skill:inject)
          local skills agent_name phase
          skills=$(echo "$json" | jq -r '.skills | join(", ")')
          agent_name=$(echo "$json" | jq -r '.agent')
          phase=$(echo "$json" | jq -r '.phase // "query"')
          if [ "$phase" = "response" ]; then
            echo -e "${MAGENTA}  ✦ Skills: ${BOLD}${skills}${NC}${MAGENTA} [${phase}] → synthesis${NC}"
          else
            echo -e "${MAGENTA}  ✦ Skills: ${BOLD}${skills}${NC}${MAGENTA} [${phase}] → ${agent_name}${NC}"
          fi
          ;;
        done)
          echo ""
          echo ""
          echo -e "${DIM}$(echo "$json" | jq '{toolsUsed, usage}')${NC}"
          ;;
      esac
    fi
  done

  echo ""
  echo -e "${CYAN}--- Stream ends ---${NC}"
}
