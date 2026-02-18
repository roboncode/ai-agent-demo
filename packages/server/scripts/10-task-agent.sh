#!/bin/bash
# Demo: Task agent - parallel multi-agent execution
source "$(dirname "$0")/config.sh"

header "Task Agent (Parallel Execution)"
info "POST /api/agents/task"
info "Breaks complex queries into sub-tasks, runs agents in parallel"
echo ""

echo -e "${YELLOW}Sending a multi-domain query that requires multiple agents...${NC}"
echo -e "${DIM}The task agent will create sub-tasks and run them in parallel.${NC}"
echo ""

curl -s "$BASE_URL/api/agents/task" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "I need three things: the weather in Paris, the top Hacker News story, and a good sci-fi movie recommendation."
  }' | jq .

echo ""
success "Done!"
