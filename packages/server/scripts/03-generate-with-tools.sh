#!/bin/bash
# Demo: Generation with tools attached
source "$(dirname "$0")/config.sh"

header "Generate with Tools"
info "POST /api/generate"
info "LLM decides when to call tools, results come back in response"
echo ""

show_system_prompt "(default - none specified)"
show_user_prompt "What is the weather like in San Francisco right now?"
echo -e "${DIM}Tools: [getWeather]  maxSteps: 3${NC}"
echo ""

curl -s "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "prompt": "What is the weather like in San Francisco right now?",
    "tools": ["getWeather"],
    "maxSteps": 3
  }' | jq .

echo ""
success "Done!"
