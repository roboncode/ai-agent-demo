#!/bin/bash
# Demo: Supervisor agent - routes to sub-agents
source "$(dirname "$0")/config.sh"

header "Supervisor Agent"
info "POST /api/agents/supervisor"
info "Routes queries to the right specialist agent automatically"
echo ""

show_system_prompt "You are a supervisor agent that routes user queries to the appropriate specialist agent.

Available agents:
- weather: Handles weather queries (current conditions, forecasts, temperature)
- hackernews: Handles Hacker News queries (trending stories, tech news)
- knowledge: Handles movie queries (search, recommendations, details)

When you receive a query:
1. Analyze what the user is asking about
2. Route to the appropriate agent using the routeToAgent tool
3. If the query spans multiple domains, make multiple tool calls
4. Synthesize the results into a coherent response

Always use the routeToAgent tool - never answer domain questions directly."

show_user_prompt "What is the weather in London and what are the top stories on Hacker News today?"

stream_sse "$BASE_URL/api/agents/supervisor" '{
    "message": "What is the weather in London and what are the top stories on Hacker News today?"
  }'

echo ""
success "Done!"
