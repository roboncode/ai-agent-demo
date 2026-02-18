#!/bin/bash
# Demo: Memory agent - persists information across calls
source "$(dirname "$0")/config.sh"

header "Memory Agent"
info "POST /api/agents/memory"
info "Agent that can save and recall information (file-based persistence)"
echo ""

# Step 1: Save some memories
echo -e "${YELLOW}Step 1: Saving memories...${NC}"
echo ""

curl -s "$BASE_URL/api/agents/memory" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Remember that my name is Alex and my favorite programming language is TypeScript."
  }' | jq .

echo ""
echo -e "${DIM}Waiting 2 seconds...${NC}"
sleep 2

# Step 2: Recall memories
echo -e "${YELLOW}Step 2: Recalling memories...${NC}"
echo ""

curl -s "$BASE_URL/api/agents/memory" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "What do you remember about me? What is my name and what language do I like?"
  }' | jq .

echo ""

# Step 3: Show the raw memory file
echo -e "${YELLOW}Step 3: Raw memory file contents:${NC}"
echo ""
cat /Users/home/Projects/jombee/ai-agent-demo/packages/server/data/memory.json 2>/dev/null | jq . || echo "(no memory file yet)"

echo ""
success "Done!"
