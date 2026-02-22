#!/bin/bash
# Demo: Web search tools — direct tool invocation (no LLM)
source "$(dirname "$0")/config.sh"

header "Web Search Tools (Direct)"
info "POST /api/tools/{toolName}"
info "Test each web tool independently without the LLM agent"
echo ""

# ── Tool 1: searchWeb ─────────────────────────────────────────

header "Tool: searchWeb"
info "Search the web via Brave Search API"
echo ""

QUERY="best JavaScript frameworks 2025"
show_user_prompt "searchWeb: \"$QUERY\" (count: 3)"

RESPONSE=$(curl -s "$BASE_URL/api/tools/searchWeb" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$(jq -n --arg q "$QUERY" '{query: $q, count: 3}')")

if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  warn "Error: $(echo "$RESPONSE" | jq -r '.error')"
  warn "Make sure BRAVE_API_KEY is set in packages/server/.env"
else
  COUNT=$(echo "$RESPONSE" | jq -r '.resultCount // 0')
  echo -e "${GREEN}Results returned: $COUNT${NC}"
  echo ""
  echo "$RESPONSE" | jq -r '.results[]? | "  \(.title)\n  \(.url)\n  \(.description[:120])\n"'
fi

# ── Tool 2: fetchPage ─────────────────────────────────────────

header "Tool: fetchPage"
info "Fetch a web page and extract readable text"
echo ""

URL="https://hono.dev"
show_user_prompt "fetchPage: $URL"

RESPONSE=$(curl -s "$BASE_URL/api/tools/fetchPage" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$(jq -n --arg u "$URL" '{url: $u}')")

TITLE=$(echo "$RESPONSE" | jq -r '.title // "N/A"')
LENGTH=$(echo "$RESPONSE" | jq -r '.contentLength // 0')
echo -e "${GREEN}Title: $TITLE${NC}"
echo -e "${DIM}Content length: $LENGTH chars${NC}"
echo ""
echo -e "${DIM}Content preview (first 10 lines):${NC}"
echo "$RESPONSE" | jq -r '.content // ""' | head -10

# ── Tool 3: getPageMeta ───────────────────────────────────────

header "Tool: getPageMeta"
info "Extract OpenGraph metadata for rich card display"
echo ""

URLS=(
  "https://github.com/honojs/hono"
  "https://bun.sh"
  "https://deno.com"
)

for URL in "${URLS[@]}"; do
  echo -e "${CYAN}${BOLD}$URL${NC}"

  RESPONSE=$(curl -s "$BASE_URL/api/tools/getPageMeta" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$(jq -n --arg u "$URL" '{url: $u}')")

  OG_TITLE=$(echo "$RESPONSE" | jq -r '.openGraph.title // "N/A"')
  OG_DESC=$(echo "$RESPONSE" | jq -r '.openGraph.description // "N/A"' | cut -c1-100)
  OG_IMAGE=$(echo "$RESPONSE" | jq -r '.openGraph.image // "none"')
  OG_SITE=$(echo "$RESPONSE" | jq -r '.openGraph.siteName // "N/A"')
  OG_TYPE=$(echo "$RESPONSE" | jq -r '.openGraph.type // "N/A"')

  echo -e "  Title:       ${BOLD}$OG_TITLE${NC}"
  echo -e "  Description: ${DIM}$OG_DESC${NC}"
  echo -e "  Image:       ${DIM}$OG_IMAGE${NC}"
  echo -e "  Site:        ${DIM}$OG_SITE${NC}"
  echo -e "  Type:        ${DIM}$OG_TYPE${NC}"
  echo ""
done

echo ""
success "Done!"
