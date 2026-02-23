#!/bin/bash
# Demo: Unified Supervisor — all modes with full event visibility
source "$(dirname "$0")/config.sh"

# Extended SSE reader that handles all event types
stream_sse_v2() {
  local url="$1"
  local data="$2"
  local output_file="$3"  # optional: capture raw done JSON
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
        tool-call)
          local tool_name args_summary
          tool_name=$(echo "$json" | jq -r '.toolName // .tool // empty')
          args_summary=$(echo "$json" | jq -c '.args // {}')
          echo ""
          echo -e "${YELLOW}  > Tool Call: ${BOLD}${tool_name}${NC}${DIM} ${args_summary}${NC}"
          ;;
        tool-result)
          local result_tool result_preview
          result_tool=$(echo "$json" | jq -r '.toolName // .tool // empty')
          result_preview=$(echo "$json" | jq -c '.result' | cut -c1-120)
          echo -e "${GREEN}  < Tool Result: ${BOLD}${result_tool}${NC}${DIM} ${result_preview}...${NC}"
          ;;
        tool:call)
          local tool_name args_summary
          tool_name=$(echo "$json" | jq -r '.tool // empty')
          args_summary=$(echo "$json" | jq -c '.args // {}')
          echo -e "${YELLOW}  > [sub-agent] Tool Call: ${BOLD}${tool_name}${NC}${DIM} ${args_summary}${NC}"
          ;;
        tool:result)
          local result_tool result_preview
          result_tool=$(echo "$json" | jq -r '.tool // empty')
          result_preview=$(echo "$json" | jq -c '.result' | cut -c1-120)
          echo -e "${GREEN}  < [sub-agent] Tool Result: ${BOLD}${result_tool}${NC}${DIM} ${result_preview}...${NC}"
          ;;
        agent:start)
          echo -e "${BLUE}${BOLD}  ▶ Agent started: $(echo "$json" | jq -r '.agent')${NC}"
          ;;
        agent:end)
          echo -e "${BLUE}${BOLD}  ■ Agent ended: $(echo "$json" | jq -r '.agent')${NC}"
          ;;
        agent:plan)
          echo ""
          echo -e "${MAGENTA}${BOLD}  Plan created:${NC}"
          echo "$json" | jq -r '.tasks[] | "    → \(.agent): \(.query)"'
          echo ""
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
        ask:user)
          echo ""
          echo -e "${RED}${BOLD}  Questions for user:${NC}"
          echo "$json" | jq -r '.questions[] | "    ? \(.question)\(if .context then " (\(.context))" else "" end)"'
          echo ""
          ;;
        status)
          echo -e "${YELLOW}  [$(echo "$json" | jq -r '.phase // empty')]${NC}"
          ;;
        done)
          echo ""
          echo ""
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

pause_between() {
  echo ""
  echo -e "${DIM}Press Enter to continue to next scenario...${NC}"
  read -r
}


# ─────────────────────────────────────────────────────────────────
# SCENARIO 1: Direct routing — single agent
# ─────────────────────────────────────────────────────────────────
header "Scenario 1: Direct Routing (single agent)"
info "The supervisor routes to one agent via routeToAgent."
info "Watch for: agent:start → delegate:start → tool:call → tool:result → delegate:end → agent:end"
echo ""

show_user_prompt "What's the weather in Tokyo?"

stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" '{
    "message": "What is the weather in Tokyo?"
  }'

pause_between


# ─────────────────────────────────────────────────────────────────
# SCENARIO 2: Direct routing — multiple agents (sequential)
# ─────────────────────────────────────────────────────────────────
header "Scenario 2: Direct Routing (multiple agents, sequential)"
info "The supervisor uses routeToAgent multiple times for a multi-part query."
info "Watch for: multiple delegate:start/end cycles with tool activity inside each"
echo ""

show_user_prompt "What's the weather in London and what's the top story on Hacker News?"

stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" '{
    "message": "What is the weather in London and what is the top story on Hacker News?"
  }'

pause_between


# ─────────────────────────────────────────────────────────────────
# SCENARIO 3: Plan mode — parallel execution (autonomous)
# ─────────────────────────────────────────────────────────────────
header "Scenario 3: Plan Mode — Parallel (autonomous)"
info "planMode: true forces createTask. Tasks execute in parallel automatically."
info "Watch for: agent:plan → delegate:start (multiple) → tool activity → delegate:end → synthesis"
echo ""

show_user_prompt "Weather in Paris, top HN story, and a sci-fi movie recommendation"

stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" '{
    "message": "I need the weather in Paris, the top Hacker News story, and a sci-fi movie recommendation.",
    "planMode": true
  }'

pause_between


# ─────────────────────────────────────────────────────────────────
# SCENARIO 4: Plan mode — human-in-the-loop approval
# ─────────────────────────────────────────────────────────────────
header "Scenario 4: Plan + Human Approval"
info "Two-phase workflow:"
info "  Phase 1: Supervisor creates a plan, pauses for approval"
info "  Phase 2: Human approves → tasks execute in parallel"
echo ""

USER_MSG="I need the current weather in Berlin and a movie recommendation."

show_user_prompt "$USER_MSG"

echo -e "${YELLOW}Phase 1: Creating plan (planMode + non-autonomous)...${NC}"
echo ""

DONE_FILE=$(mktemp)

stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" "$(jq -n \
  --arg msg "$USER_MSG" \
  '{message: $msg, planMode: true, autonomous: false}')" \
  "$DONE_FILE"

echo ""

# Extract tasks from the done event
AWAITING=$(jq -r '.awaitingApproval // empty' "$DONE_FILE" 2>/dev/null)
TASKS_JSON=$(jq -c '.tasks // []' "$DONE_FILE" 2>/dev/null)
TASK_COUNT=$(echo "$TASKS_JSON" | jq 'length')

if [[ "$AWAITING" != "true" || "$TASK_COUNT" == "0" ]]; then
  warn "No plan was returned for approval. The LLM may have answered directly."
  cat "$DONE_FILE" | jq . 2>/dev/null
  rm -f "$DONE_FILE"
  pause_between
else
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}Proposed Plan (${TASK_COUNT} tasks):${NC}"
  echo ""
  echo "$TASKS_JSON" | jq -r 'to_entries[] | "  \(.key + 1)) \(.value.agent): \(.value.query)"'
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  echo ""
  echo -e "${YELLOW}Phase 2: Human review${NC}"
  echo ""
  echo -e "Do you want to ${GREEN}approve${NC} or ${RED}reject${NC} this plan?"
  echo ""
  echo "  1) Approve — execute all tasks in parallel"
  echo "  2) Reject  — cancel"
  echo ""
  read -p "Enter choice (1 or 2): " choice

  case $choice in
    1)
      echo ""
      echo -e "${GREEN}Approved! Executing plan...${NC}"
      echo ""

      APPROVED_PLAN=$(echo "$TASKS_JSON" | jq -c '[.[] | {agent, query}]')

      stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" "$(jq -n \
        --arg msg "$USER_MSG" \
        --argjson plan "$APPROVED_PLAN" \
        '{message: $msg, approvedPlan: $plan}')"
      ;;
    2)
      echo ""
      echo -e "${RED}Plan rejected. No tasks executed.${NC}"
      ;;
    *)
      echo "Invalid choice. Plan rejected."
      ;;
  esac

  rm -f "$DONE_FILE"
  pause_between
fi


# ─────────────────────────────────────────────────────────────────
# SCENARIO 5: Interactive — askUser
# ─────────────────────────────────────────────────────────────────
header "Scenario 5: Interactive Mode (askUser)"
info "autonomous: false with a vague query — supervisor should ask for clarification."
info "Watch for: ask:user event with questions before any routing happens"
echo ""

show_user_prompt "What's the weather today?"

stream_sse_v2 "$BASE_URL/api/agents/supervisor?format=sse" '{
    "message": "What is the weather today?",
    "autonomous": false
  }'

echo ""
success "All scenarios complete!"
