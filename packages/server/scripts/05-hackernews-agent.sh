#!/bin/bash
# Demo: Hacker News analyst agent
source "$(dirname "$0")/config.sh"

header "Hacker News Agent"
info "POST /api/agents/hackernews"
info "Specialist agent with HN tools (Firebase API)"
echo ""

show_system_prompt "You are a Hacker News analyst agent. Your job is to help users discover and understand trending tech stories.

When asked about Hacker News:
1. Use getTopStories to fetch current top stories
2. Use getStoryDetail to dive deeper into specific stories if asked
3. Provide summaries, highlight interesting trends, and share insights
4. Note high-scoring stories and active discussions

Present information in an engaging, tech-news style."

show_user_prompt "What are the top 5 stories on Hacker News right now? Give me a brief summary of each."

curl -s "$BASE_URL/api/agents/hackernews" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "What are the top 5 stories on Hacker News right now? Give me a brief summary of each."
  }' | jq .

echo ""
success "Done!"
