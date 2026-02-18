#!/bin/bash
# Demo: Hacker News analyst agent
source "$(dirname "$0")/config.sh"

header "Hacker News Agent"
info "POST /api/agents/hackernews"
info "Specialist agent with HN tools (Firebase API)"
echo ""

curl -s "$BASE_URL/api/agents/hackernews" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "What are the top 5 stories on Hacker News right now? Give me a brief summary of each."
  }' | jq .

echo ""
success "Done!"
