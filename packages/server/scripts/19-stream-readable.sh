#!/bin/bash
# Same as 18 but text-delta events stream as readable text instead of per-chunk labels
source "$(dirname "$0")/config.sh"

header "SSE Stream Test — supervisor direct route (readable)"
show_user_prompt "What's the weather in Tokyo?"

echo -e "${CYAN}--- Raw SSE events ---${NC}"
echo ""

curl -sN "$BASE_URL/api/agents/supervisor?format=sse" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"message":"What is the weather in Tokyo?"}' | while IFS= read -r line; do
  if [[ "$line" == event:* ]]; then
    current_event="${line#event: }"
  elif [[ "$line" == data:* ]]; then
    json="${line#data: }"
    case "$current_event" in
      text-delta)
        printf "%s" "$(echo "$json" | jq -r '.text // empty')"
        ;;
      agent:start|agent:end|agent:think)
        echo -e "${BLUE}[$current_event]${NC} $(echo "$json" | jq -c '.')"
        ;;
      delegate:start|delegate:end)
        echo -e "${CYAN}[$current_event]${NC} $(echo "$json" | jq -c '.')"
        ;;
      tool:call|tool:result)
        echo -e "${YELLOW}[$current_event]${NC} $(echo "$json" | jq -c '.' | cut -c1-120)"
        ;;
      ask:user)
        echo -e "${MAGENTA}[$current_event]${NC} $(echo "$json" | jq -c '.')"
        ;;
      done)
        echo ""
        echo -e "${DIM}[done]${NC} $(echo "$json" | jq -c '{toolsUsed, conversationId, usage}')"
        ;;
      *)
        echo -e "${DIM}[$current_event]${NC} $json"
        ;;
    esac
  fi
done

echo ""
echo -e "${CYAN}--- Stream ends ---${NC}"
