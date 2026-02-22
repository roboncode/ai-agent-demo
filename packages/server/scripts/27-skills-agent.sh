#!/bin/bash
# Demo: Skills agent - manages behavioral skills via conversation
source "$(dirname "$0")/config.sh"

header "Skills Agent"
info "POST /api/agents/skills"
info "Conversational agent for creating and managing behavioral skills"
echo ""

show_system_prompt "You are a skills management agent. You help users create, edit, and manage behavioral
skills that modify how other agents approach tasks."

# Step 1: List existing skills
echo -e "${YELLOW}Step 1: Ask the agent to list skills${NC}"
echo ""

show_user_prompt "What skills are currently available?"

stream_sse "$BASE_URL/api/agents/skills" '{
    "message": "What skills are currently available?"
  }'

echo ""
echo -e "${DIM}Waiting 2 seconds...${NC}"
sleep 2

# Step 2: Ask agent to create a skill
echo -e "${YELLOW}Step 2: Ask the agent to create a new skill${NC}"
echo ""

show_user_prompt "Create a skill called 'formal-writing' for when users need professional, business-appropriate responses. It should instruct the agent to use complete sentences, avoid slang, and maintain a neutral professional tone."

stream_sse "$BASE_URL/api/agents/skills" '{
    "message": "Create a skill called formal-writing for when users need professional, business-appropriate responses. It should instruct the agent to use complete sentences, avoid slang, and maintain a neutral professional tone."
  }'

echo ""
echo -e "${DIM}Waiting 2 seconds...${NC}"
sleep 2

# Step 3: Verify the skill was created
echo -e "${YELLOW}Step 3: Verify via REST API${NC}"
echo ""

curl -s "$BASE_URL/api/skills/formal-writing" \
  -H "X-API-Key: $API_KEY" | jq '{name, description, tags}'

echo ""
echo -e "${DIM}Waiting 1 second...${NC}"
sleep 1

# Step 4: Clean up
echo -e "${YELLOW}Step 4: Clean up - delete test skill${NC}"
echo ""

curl -s -X DELETE "$BASE_URL/api/skills/formal-writing" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""
success "Done!"
