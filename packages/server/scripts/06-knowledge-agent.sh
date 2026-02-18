#!/bin/bash
# Demo: Knowledge base agent (Movies via TMDB)
source "$(dirname "$0")/config.sh"

header "Knowledge Agent (Movies)"
info "POST /api/agents/knowledge"
info "Specialist agent with TMDB movie tools"
echo ""

curl -s "$BASE_URL/api/agents/knowledge" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Find me the best sci-fi movies from 2024. What would you recommend and why?"
  }' | jq .

echo ""
success "Done!"
