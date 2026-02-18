#!/bin/bash
# Demo: Supervisor agent - routes to sub-agents
source "$(dirname "$0")/config.sh"

header "Supervisor Agent"
info "POST /api/agents/supervisor"
info "Routes queries to the right specialist agent automatically"
echo ""

echo -e "${YELLOW}Sending a multi-domain query...${NC}"
echo -e "${DIM}The supervisor will decide which agent(s) to use.${NC}"
echo ""

curl -s "$BASE_URL/api/agents/supervisor" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "What is the weather in London and what are the top stories on Hacker News today?"
  }' | jq .

echo ""
success "Done!"
