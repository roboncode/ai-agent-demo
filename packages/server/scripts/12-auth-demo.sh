#!/bin/bash
# Demo: API key authentication requirement
source "$(dirname "$0")/config.sh"

header "Auth Demo"
info "Shows that API routes require X-API-Key header"
echo ""

show_user_prompt "hello"

# Without API key
echo -e "${RED}Without API key:${NC}"
echo -e "${DIM}curl $BASE_URL/api/generate (no X-API-Key header)${NC}"
echo ""

curl -s "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "hello"}' | jq .

echo ""

# With wrong API key
echo -e "${RED}With wrong API key:${NC}"
echo -e "${DIM}X-API-Key: wrong-key${NC}"
echo ""

curl -s "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{"prompt": "hello"}' | jq .

echo ""

# With correct API key
echo -e "${GREEN}With correct API key:${NC}"
echo -e "${DIM}X-API-Key: $API_KEY${NC}"
echo ""

curl -s "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"prompt": "Say hello in one word."}' | jq .

echo ""
success "Done!"
