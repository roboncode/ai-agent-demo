#!/bin/bash
# Demo: Weather specialist agent
source "$(dirname "$0")/config.sh"

header "Weather Agent"
info "POST /api/agents/weather"
info "Specialist agent with weather tools (Open-Meteo API)"
echo ""

curl -s "$BASE_URL/api/agents/weather" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "What is the weather like in Tokyo and New York right now? Compare them."
  }' | jq .

echo ""
success "Done!"
