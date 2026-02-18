#!/bin/bash
# Demo: Task agent - parallel multi-agent execution
source "$(dirname "$0")/config.sh"

header "Task Agent (Parallel Execution)"
info "POST /api/agents/task"
info "Breaks complex queries into sub-tasks, runs agents in parallel"
echo ""

show_system_prompt "You are a task delegation agent that breaks complex queries into parallel sub-tasks.

When you receive a complex query that spans multiple domains:
1. Analyze what information is needed
2. Create individual tasks using the createTask tool for each distinct sub-query
3. Tasks will be executed in parallel for efficiency

Available agents for tasks:
- weather: Weather information
- hackernews: Hacker News stories and tech news
- knowledge: Movie information and recommendations

Create one task per distinct information need. Be specific in your task queries."

show_user_prompt "I need three things: the weather in Paris, the top Hacker News story, and a good sci-fi movie recommendation."

curl -s "$BASE_URL/api/agents/task" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "I need three things: the weather in Paris, the top Hacker News story, and a good sci-fi movie recommendation."
  }' | jq .

echo ""
success "Done!"
