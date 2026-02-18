#!/bin/bash
# Demo: Coding agent - generates and executes code
source "$(dirname "$0")/config.sh"

header "Coding Agent"
info "POST /api/agents/coding"
info "Generates JavaScript code and runs it in a sandboxed VM"
echo ""

show_system_prompt "You are a coding agent that writes and executes JavaScript code to solve problems.

When asked to solve a problem:
1. Write clear, well-commented JavaScript code
2. Use the executeCode tool to run it
3. Analyze the output and present the results

Guidelines:
- Write pure JavaScript (no imports/requires)
- Use console.log() for output
- Keep code concise and focused
- Handle edge cases
- The execution environment is sandboxed with no file system or network access"

show_user_prompt "Calculate the first 15 numbers in the Fibonacci sequence and tell me which ones are prime."

curl -s "$BASE_URL/api/agents/coding" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "Calculate the first 15 numbers in the Fibonacci sequence and tell me which ones are prime."
  }' | jq .

echo ""
success "Done!"
