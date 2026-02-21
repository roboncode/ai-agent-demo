#!/bin/bash
# Demo: Interactive supervisor — triage (askUser vs proceed) across multiple scenarios
# Usage: DEBUG_SSE=1 ./17-interactive-supervisor.sh  — shows raw SSE event data
source "$(dirname "$0")/config.sh"

stream_sse_v2() {
  local url="$1"
  local data="$2"
  local output_file="$3"
  local current_event=""

  echo -e "${CYAN}--- Stream starts ---${NC}"
  echo ""

  curl -sN "$url" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$data" | while IFS= read -r line; do
    if [[ "$line" == event:* ]]; then
      current_event="${line#event: }"
    elif [[ "$line" == data:* ]]; then
      local json="${line#data: }"
      case "$current_event" in
        text-delta)
          printf "%s" "$(echo "$json" | jq -r '.text // empty')"
          ;;
        tool-call|tool:call)
          local tool_name args_summary
          tool_name=$(echo "$json" | jq -r '.toolName // .tool // empty')
          args_summary=$(echo "$json" | jq -c '.args // {}')
          echo -e "${YELLOW}  > Tool Call: ${BOLD}${tool_name}${NC}${DIM} ${args_summary}${NC}"
          ;;
        tool-result|tool:result)
          local result_tool result_preview
          result_tool=$(echo "$json" | jq -r '.toolName // .tool // empty')
          result_preview=$(echo "$json" | jq -c '.result' | cut -c1-120)
          echo -e "${GREEN}  < Tool Result: ${BOLD}${result_tool}${NC}${DIM} ${result_preview}...${NC}"
          ;;
        agent:start)
          echo -e "${BLUE}${BOLD}  ▶ Agent started: $(echo "$json" | jq -r '.agent')${NC}"
          ;;
        agent:end)
          echo -e "${BLUE}${BOLD}  ■ Agent ended: $(echo "$json" | jq -r '.agent')${NC}"
          ;;
        agent:think)
          echo -e "${DIM}  $(echo "$json" | jq -r '.text')${NC}"
          ;;
        delegate:start)
          local from to query
          from=$(echo "$json" | jq -r '.from')
          to=$(echo "$json" | jq -r '.to')
          query=$(echo "$json" | jq -r '.query')
          echo -e "${CYAN}  ⤷ Delegating: ${from} → ${BOLD}${to}${NC}${DIM} \"${query}\"${NC}"
          ;;
        delegate:end)
          local to summary
          to=$(echo "$json" | jq -r '.to')
          summary=$(echo "$json" | jq -r '.summary' | cut -c1-80)
          echo -e "${GREEN}  ⤶ Done: ${BOLD}${to}${NC}${DIM} ${summary}...${NC}"
          ;;
        agent:plan)
          echo ""
          echo -e "${MAGENTA}${BOLD}  Plan created:${NC}"
          echo "$json" | jq -r '(.tasks // [])[] | "    → \(.agent): \(.query)"'
          echo ""
          ;;
        ask:user)
          echo ""
          echo -e "${MAGENTA}${BOLD}  Agent needs input:${NC}"
          if [[ "$DEBUG_SSE" == "1" ]]; then
            echo -e "${DIM}  [debug] raw ask:user data: $json${NC}"
          fi
          echo "$json" | jq -r '(.items // [])[] | "    [\(.type)] \(.text)\(if .context then "  (\(.context))" else "" end)"'
          echo ""
          ;;
        done)
          echo ""
          if [[ "$DEBUG_SSE" == "1" ]]; then
            echo -e "${DIM}  [debug] raw done data: $json${NC}"
          fi
          echo -e "${DIM}$(echo "$json" | jq '{toolsUsed, conversationId, usage}')${NC}"
          if [[ -n "$output_file" ]]; then
            echo "$json" > "$output_file"
          fi
          ;;
      esac
    fi
  done

  echo ""
  echo -e "${CYAN}--- Stream ends ---${NC}"
}

# Run a single scenario: send query, handle askUser if triggered, show result
run_scenario() {
  local title="$1"
  local user_msg="$2"
  local expect="$3"  # "ask" or "route"

  header "$title"
  info "Expected: $expect"
  echo ""
  show_user_prompt "$user_msg"

  DONE_FILE=$(mktemp)

  stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" "$(jq -n \
    --arg msg "$user_msg" \
    '{message: $msg, autonomous: false}')" \
    "$DONE_FILE"

  echo ""

  AWAITING=$(jq -r '.awaitingResponse // empty' "$DONE_FILE" 2>/dev/null)

  if [[ "$DEBUG_SSE" == "1" ]]; then
    echo -e "${DIM}  [debug] DONE_FILE contents: $(cat "$DONE_FILE" 2>/dev/null | head -c 500)${NC}"
    echo -e "${DIM}  [debug] awaitingResponse=$AWAITING${NC}"
  fi

  if [[ "$AWAITING" == "true" ]]; then
    ITEMS=$(jq -c '.items // []' "$DONE_FILE" 2>/dev/null)

    if [[ "$DEBUG_SSE" == "1" ]]; then
      echo -e "${DIM}  [debug] ITEMS=$ITEMS${NC}"
    fi

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Agent needs input:${NC}"
    echo ""
    echo "$ITEMS" | jq -r '.[] | "  [\(.type)] \(.text)"'
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    read -p "Your answer (or press Enter to skip): " USER_ANSWER

    if [[ -n "$USER_ANSWER" ]]; then
      echo ""
      echo -e "${GREEN}Sending your answer back to the supervisor...${NC}"
      echo ""

      FOLLOWUP_MSG="$USER_ANSWER. (Original question: $user_msg)"

      stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" "$(jq -n \
        --arg msg "$FOLLOWUP_MSG" \
        '{message: $msg}')"
    fi

    if [[ "$expect" == "ask" ]]; then
      echo ""
      echo -e "${GREEN}✓ Correctly asked for clarification${NC}"
    else
      echo ""
      echo -e "${RED}✗ Expected to route directly but asked instead${NC}"
    fi
  else
    if [[ "$expect" == "route" ]]; then
      echo ""
      echo -e "${GREEN}✓ Correctly routed directly${NC}"
    else
      echo ""
      echo -e "${RED}✗ Expected to ask for clarification but routed directly${NC}"
    fi
  fi

  rm -f "$DONE_FILE"
  echo ""
  echo -e "${DIM}Press Enter for next scenario...${NC}"
  read -r
}

# ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}${BLUE}"
echo "  Interactive Supervisor — Triage Test Suite"
echo "  Tests whether the supervisor asks for clarification (askUser)"
echo "  or routes directly (proceed) based on query specificity."
echo -e "${NC}"
echo ""

# ── SHOULD ASK ───────────────────────────────────────────────────

run_scenario \
  "1. Vague weather (no location)" \
  "What's the weather?" \
  "ask"

run_scenario \
  "2. Vague news (no topic)" \
  "What's trending?" \
  "ask"

run_scenario \
  "3. Vague movie (no genre/title)" \
  "Recommend me a movie" \
  "ask"

# ── SHOULD ROUTE ─────────────────────────────────────────────────

run_scenario \
  "4. Specific weather (has location)" \
  "What's the weather in Tokyo?" \
  "route"

run_scenario \
  "5. Specific news" \
  "What are the top stories on Hacker News right now?" \
  "route"

run_scenario \
  "6. Specific movie" \
  "Tell me about the movie Inception" \
  "route"

# ── SUMMARY ──────────────────────────────────────────────────────
echo ""
success "All scenarios complete!"
