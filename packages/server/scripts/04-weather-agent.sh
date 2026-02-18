#!/bin/bash
# Demo: Weather specialist agent
source "$(dirname "$0")/config.sh"

header "Weather Agent"
info "POST /api/agents/weather"
info "Specialist agent with weather tools (Open-Meteo API)"
echo ""

show_system_prompt "You are a weather specialist agent. Your job is to provide accurate, helpful weather information.

When asked about weather:
1. Use the getWeather tool to fetch current conditions
2. Present the data in a clear, conversational format
3. Include temperature, conditions, humidity, and wind info
4. Offer practical advice based on conditions

Always use the tool to get real data rather than guessing."

show_user_prompt "What is the weather like in Tokyo and New York right now? Compare them."

stream_sse "$BASE_URL/api/agents/weather" '{
    "message": "What is the weather like in Tokyo and New York right now? Compare them."
  }'

echo ""
success "Done!"
