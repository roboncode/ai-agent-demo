#!/bin/bash
# Demo: Human-in-the-loop agent - propose, review, approve/reject
source "$(dirname "$0")/config.sh"

header "Human-in-the-Loop Agent"
info "Two-phase workflow:"
info "  Phase 1: POST /api/agents/human-in-loop  (AI proposes action)"
info "  Phase 2: POST /api/agents/human-in-loop/approve  (Human approves/rejects)"
echo ""

# Phase 1: Propose an action
echo -e "${YELLOW}Phase 1: Proposing an action...${NC}"
echo -e "${DIM}Asking the AI to send an email (it will propose, not execute)${NC}"
echo ""

RESPONSE=$(curl -s "$BASE_URL/api/agents/human-in-loop" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Send an email to john@example.com letting him know the project is ready for review."
  }')

echo "$RESPONSE" | jq .

# Extract the action ID
ACTION_ID=$(echo "$RESPONSE" | jq -r '.pendingActions[0].id // empty')

if [[ -z "$ACTION_ID" ]]; then
  echo ""
  warn "No pending action was returned. Exiting."
  exit 1
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Action ID: ${ACTION_ID}${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Phase 2: Ask human for approval
echo -e "${YELLOW}Phase 2: Human review${NC}"
echo ""
echo -e "Do you want to ${GREEN}approve${NC} or ${RED}reject${NC} this action?"
echo ""
echo "  1) Approve"
echo "  2) Reject"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
  1)
    APPROVED=true
    echo ""
    echo -e "${GREEN}Approving action...${NC}"
    ;;
  2)
    APPROVED=false
    echo ""
    echo -e "${RED}Rejecting action...${NC}"
    ;;
  *)
    echo "Invalid choice. Defaulting to reject."
    APPROVED=false
    ;;
esac

echo ""

curl -s "$BASE_URL/api/agents/human-in-loop/approve" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"id\": \"$ACTION_ID\",
    \"approved\": $APPROVED
  }" | jq .

echo ""
success "Done!"
