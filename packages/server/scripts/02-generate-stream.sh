#!/bin/bash
# Demo: Streaming text generation (SSE)
source "$(dirname "$0")/config.sh"

header "Generate (Streaming SSE)"
info "POST /api/generate/stream"
info "Watch tokens arrive in real-time via Server-Sent Events"
echo ""

echo -e "${CYAN}--- Stream starts ---${NC}"
echo ""

# Stream the response and print text deltas inline
curl -sN "$BASE_URL/api/generate/stream" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "prompt": "Write a short poem about AI agents working together.",
    "systemPrompt": "You are a creative poet."
  }' | while IFS= read -r line; do
  # SSE lines starting with "data:" contain our payload
  if [[ "$line" == data:* ]]; then
    data="${line#data:}"
    # Try to extract text from text-delta events
    text=$(echo "$data" | jq -r '.text // empty' 2>/dev/null)
    if [[ -n "$text" ]]; then
      printf "%s" "$text"
    fi
    # Check for done event
    reason=$(echo "$data" | jq -r '.finishReason // empty' 2>/dev/null)
    if [[ -n "$reason" ]]; then
      echo ""
      echo ""
      echo -e "${DIM}Finish reason: $reason${NC}"
      # Show usage, cost, and duration if available
      input_tokens=$(echo "$data" | jq -r '.usage.inputTokens // empty' 2>/dev/null)
      output_tokens=$(echo "$data" | jq -r '.usage.outputTokens // empty' 2>/dev/null)
      total_tokens=$(echo "$data" | jq -r '.usage.totalTokens // empty' 2>/dev/null)
      cost=$(echo "$data" | jq -r '.usage.cost // empty' 2>/dev/null)
      duration=$(echo "$data" | jq -r '.usage.durationMs // empty' 2>/dev/null)
      if [[ -n "$total_tokens" ]]; then
        echo -e "${DIM}Tokens:   ${input_tokens} input + ${output_tokens} output = ${total_tokens} total${NC}"
      fi
      if [[ -n "$cost" && "$cost" != "null" ]]; then
        cost_fmt=$(printf '$%.6f' "$cost")
        echo -e "${DIM}Cost:     ${cost_fmt}${NC}"
      fi
      if [[ -n "$duration" ]]; then
        duration_s=$(echo "scale=2; $duration / 1000" | bc)
        echo -e "${DIM}Duration: ${duration_s}s${NC}"
      fi
    fi
  fi
done

echo ""
echo -e "${CYAN}--- Stream ends ---${NC}"
echo ""
success "Done!"
