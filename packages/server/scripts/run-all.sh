#!/bin/bash
# Run all demo scripts sequentially
source "$(dirname "$0")/config.sh"

echo ""
echo -e "${BOLD}${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║         AI Agent Demo - Full Test Suite                   ║${NC}"
echo -e "${BOLD}${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Server: $BASE_URL${NC}"
echo -e "${DIM}API Key: $API_KEY${NC}"
echo ""

# Check server is running
if ! curl -s "$BASE_URL/" > /dev/null 2>&1; then
  echo -e "${RED}Server is not running at $BASE_URL${NC}"
  echo -e "Start it with: ${BOLD}bun --watch src/index.ts${NC}"
  exit 1
fi

success "Server is running!"
echo ""

SCRIPTS=(
  "01-generate.sh"
  "02-generate-stream.sh"
  "03-generate-with-tools.sh"
  "04-weather-agent.sh"
  "05-hackernews-agent.sh"
  "06-knowledge-agent.sh"
  "07-supervisor-agent.sh"
  "08-memory-agent.sh"
  "10-task-agent.sh"
  "11-coding-agent.sh"
  "12-auth-demo.sh"
)

SCRIPT_DIR="$(dirname "$0")"

for script in "${SCRIPTS[@]}"; do
  bash "$SCRIPT_DIR/$script"
  echo ""
  echo -e "${DIM}Press Enter to continue to next demo (Ctrl+C to stop)...${NC}"
  read
done

echo ""
echo -e "${BOLD}${GREEN}All demos complete!${NC}"
echo ""
echo -e "${DIM}Skipped interactive demos:${NC}"
echo -e "${DIM}  09-human-in-loop.sh  (requires interactive approval)${NC}"
echo -e "${DIM}  13-memory-rest.sh    (requires interactive key lookup)${NC}"
echo -e "${DIM}Run these individually with: bash scripts/09-human-in-loop.sh${NC}"
