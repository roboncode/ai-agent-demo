#!/bin/bash
# Demo: Memory REST API - view and manage stored memories
source "$(dirname "$0")/config.sh"

header "Memory REST API"
info "CRUD operations on the memory store"
echo ""

# List all memories
echo -e "${YELLOW}GET /api/memory - List all memories:${NC}"
echo ""

curl -s "$BASE_URL/api/memory" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""

# Prompt for key to look up
echo -e "${YELLOW}Look up a specific memory key?${NC}"
echo -e "${DIM}(press Enter to skip)${NC}"
read -p "Key: " MEMORY_KEY

if [[ -n "$MEMORY_KEY" ]]; then
  echo ""
  echo -e "${YELLOW}GET /api/memory/$MEMORY_KEY:${NC}"
  echo ""
  curl -s "$BASE_URL/api/memory/$MEMORY_KEY" \
    -H "X-API-Key: $API_KEY" | jq .
fi

echo ""
success "Done!"
