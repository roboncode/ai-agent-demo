#!/bin/bash
# Demo: Guardrails agent - finance advisor with input classification gate
source "$(dirname "$0")/config.sh"

header "Guardrails Agent (Finance Advisor)"
info "POST /api/agents/guardrails"
info "Two-phase pattern: classify input (generateObject) → generate advice (generateText)"
echo ""

show_system_prompt "Phase 1: Classify whether the query is a personal finance question. Phase 2: If allowed, generate finance advice."

# --- Test 1: Allowed finance question ---
echo -e "${BOLD}${GREEN}Test 1: In-scope finance question${NC}"
show_user_prompt "How should I start budgeting on a \$50k salary?"

RESPONSE1=$(curl -s "$BASE_URL/api/agents/guardrails" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "How should I start budgeting on a $50k salary?"
  }')

ALLOWED=$(echo "$RESPONSE1" | jq -r '.allowed')
CATEGORY=$(echo "$RESPONSE1" | jq -r '.category')
REASON=$(echo "$RESPONSE1" | jq -r '.reason')

if [ "$ALLOWED" = "true" ]; then
  echo -e "${GREEN}${BOLD}PASS${NC} - Classification: ${BOLD}$CATEGORY${NC}"
  echo -e "${DIM}Reason: $REASON${NC}"
  echo ""
  echo -e "${BOLD}Finance Advice:${NC}"
  echo "$RESPONSE1" | jq -r '.response'
else
  echo -e "${RED}${BOLD}BLOCKED${NC} (unexpected!) - Category: $CATEGORY"
  echo -e "${DIM}Reason: $REASON${NC}"
fi
echo ""
echo -e "${DIM}$(echo "$RESPONSE1" | jq '{usage}')${NC}"

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# --- Test 2: Off-topic question (should be blocked) ---
echo -e "${BOLD}${RED}Test 2: Off-topic question${NC}"
show_user_prompt "What's the best recipe for chocolate cake?"

RESPONSE2=$(curl -s "$BASE_URL/api/agents/guardrails" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "What is the best recipe for chocolate cake?"
  }')

ALLOWED2=$(echo "$RESPONSE2" | jq -r '.allowed')
CATEGORY2=$(echo "$RESPONSE2" | jq -r '.category')
REASON2=$(echo "$RESPONSE2" | jq -r '.reason')

if [ "$ALLOWED2" = "false" ]; then
  echo -e "${RED}${BOLD}BLOCKED${NC} - Classification: ${BOLD}$CATEGORY2${NC}"
  echo -e "${DIM}Reason: $REASON2${NC}"
  echo ""
  echo -e "${DIM}No response generated (guardrail prevented off-topic query)${NC}"
else
  echo -e "${GREEN}${BOLD}PASS${NC} (unexpected!) - Category: $CATEGORY2"
  echo -e "${DIM}Reason: $REASON2${NC}"
fi
echo ""
echo -e "${DIM}$(echo "$RESPONSE2" | jq '{usage}')${NC}"

echo ""
success "Done!"
