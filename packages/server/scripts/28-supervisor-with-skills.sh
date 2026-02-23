#!/bin/bash
# Demo: Supervisor with skills - auto-detects and injects behavioral skills
source "$(dirname "$0")/config.sh"

header "Supervisor with Skills"
info "POST /api/agents/supervisor"
info "Supervisor auto-detects relevant skills and injects them into specialist agents"
echo ""

# Step 1: Query that should trigger eli5 skill
echo -e "${YELLOW}Step 1: Query that should trigger 'eli5' skill${NC}"
echo ""

show_user_prompt "Explain quantum computing in simple terms, like I'm five"

stream_sse "$BASE_URL/api/agents/supervisor" '{
    "message": "Explain quantum computing in simple terms, like I am five"
  }'

echo ""
echo -e "${DIM}Waiting 3 seconds...${NC}"
sleep 3

# Step 2: Query that should trigger concise-summarizer skill
echo -e "${YELLOW}Step 2: Query that should trigger 'concise-summarizer' skill${NC}"
echo ""

show_user_prompt "Give me a TLDR of the current top Hacker News stories"

stream_sse "$BASE_URL/api/agents/supervisor" '{
    "message": "Give me a TLDR of the current top Hacker News stories"
  }'

echo ""
echo -e "${DIM}Waiting 3 seconds...${NC}"
sleep 3

# Step 3: Query with no skill match (plain routing)
echo -e "${YELLOW}Step 3: Query with no skill match (plain routing)${NC}"
echo ""

show_user_prompt "What is the weather in Tokyo?"

stream_sse "$BASE_URL/api/agents/supervisor" '{
    "message": "What is the weather in Tokyo?"
  }'

echo ""
success "Done!"
