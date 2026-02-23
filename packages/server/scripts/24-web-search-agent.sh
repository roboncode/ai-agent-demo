#!/bin/bash
# Demo: Web search agent — Brave Search, page fetching, OpenGraph extraction
source "$(dirname "$0")/config.sh"

header "Web Search Agent"
info "POST /api/agents/web-search"
info "Specialist agent with Brave Search, page fetching, and OpenGraph metadata tools"
echo ""

show_system_prompt "You are a web search specialist agent. Your job is to find information on the internet and provide accurate, well-sourced answers.

You have three tools:
1. searchWeb — Search the web for a query
2. fetchPage — Fetch and extract readable text from a specific URL
3. getPageMeta — Extract OpenGraph metadata from a URL for rich preview cards

Workflow:
1. Start with searchWeb to find relevant results
2. If the user needs specific details from a page, use fetchPage on the most relevant URLs
3. If the user would benefit from a visual preview card, use getPageMeta on key URLs
4. Synthesize the information into a clear, helpful response

Always cite your sources with URLs."

# ── Scenario selector ──────────────────────────────────────────

SCENARIO="${1:-1}"

case "$SCENARIO" in
  1)
    TITLE="Basic Web Search"
    MSG="What is Hono.js? Give me a brief summary of the framework."
    ;;
  2)
    TITLE="Search + Fetch Page Content"
    MSG="Find me a Thai restaurant in Austin, TX and tell me about their menu."
    ;;
  3)
    TITLE="Search + OpenGraph Cards"
    MSG="Find the official Bun.js website and get me a preview card for it."
    ;;
  4)
    TITLE="Multi-Step Research"
    MSG="What are the top 3 JavaScript runtime alternatives to Node.js in 2025? Compare their key features with links to their official sites."
    ;;
  5)
    TITLE="Current Events Search"
    MSG="What are the latest developments in AI agents and autonomous coding tools?"
    ;;
  all)
    echo -e "${BOLD}Running all scenarios...${NC}"
    echo ""
    for i in 1 2 3 4 5; do
      "$0" "$i"
      echo ""
      echo ""
    done
    exit 0
    ;;
  *)
    echo -e "${RED}Unknown scenario: $SCENARIO${NC}"
    echo ""
    echo "Usage: $0 [scenario]"
    echo ""
    echo "Scenarios:"
    echo "  1  Basic Web Search (default)"
    echo "  2  Search + Fetch Page Content (restaurant menu)"
    echo "  3  Search + OpenGraph Cards (preview metadata)"
    echo "  4  Multi-Step Research (compare runtimes)"
    echo "  5  Current Events Search"
    echo "  all  Run all scenarios"
    exit 1
    ;;
esac

header "Scenario $SCENARIO: $TITLE"
show_user_prompt "$MSG"

stream_sse "$BASE_URL/api/agents/web-search" "$(jq -n --arg msg "$MSG" '{message: $msg}')"

echo ""
success "Done!"
