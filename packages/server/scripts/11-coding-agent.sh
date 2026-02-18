#!/bin/bash
# Demo: Coding agent - generates and executes code
source "$(dirname "$0")/config.sh"

header "Coding Agent"
info "POST /api/agents/coding"
info "Generates JavaScript code and runs it in a sandboxed VM"
echo ""

curl -s "$BASE_URL/api/agents/coding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Calculate the first 15 numbers in the Fibonacci sequence and tell me which ones are prime."
  }' | jq .

echo ""
success "Done!"
