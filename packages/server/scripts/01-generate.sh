#!/bin/bash
# Demo: Basic text generation (non-streaming)
source "$(dirname "$0")/config.sh"

header "Generate (Non-Streaming)"
info "POST /api/generate"
info "Simple prompt -> JSON response"
echo ""

curl -s "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "prompt": "Explain what an AI agent is in 2-3 sentences.",
    "systemPrompt": "You are a concise technical explainer."
  }' | jq .

echo ""
success "Done!"
