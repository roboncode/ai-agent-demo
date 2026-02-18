#!/bin/bash
# Demo: Structured output agent - generates typed JSON recipes via generateObject
source "$(dirname "$0")/config.sh"

header "Structured Output Agent (Recipe Generator)"
info "POST /api/agents/recipe"
info "Uses AI SDK generateObject + Zod schema for guaranteed-type JSON output"
echo ""

show_system_prompt "You are a professional chef and recipe creator. When given a food topic or request, generate a complete, well-structured recipe."

show_user_prompt "A quick pasta dish with garlic and cherry tomatoes"

RESPONSE=$(curl -s "$BASE_URL/api/agents/recipe" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "message": "A quick pasta dish with garlic and cherry tomatoes"
  }')

# Show the full structured response
echo -e "${BOLD}Structured Response:${NC}"
echo "$RESPONSE" | jq .

# Pretty-print key parts
echo ""
echo -e "${BOLD}Recipe: ${GREEN}$(echo "$RESPONSE" | jq -r '.recipe.name')${NC}"
echo -e "${DIM}$(echo "$RESPONSE" | jq -r '.recipe.description')${NC}"
echo ""
echo -e "Prep: $(echo "$RESPONSE" | jq -r '.recipe.prepTime')  |  Cook: $(echo "$RESPONSE" | jq -r '.recipe.cookTime')  |  Servings: $(echo "$RESPONSE" | jq -r '.recipe.servings')  |  Difficulty: $(echo "$RESPONSE" | jq -r '.recipe.difficulty')"
echo ""

echo -e "${BOLD}Ingredients:${NC}"
echo "$RESPONSE" | jq -r '.recipe.ingredients[] | "  - \(.amount) \(.name)\(if .notes then " (\(.notes))" else "" end)"'
echo ""

echo -e "${BOLD}Steps:${NC}"
echo "$RESPONSE" | jq -r '.recipe.steps[] | "  \(.step). \(.instruction)"'
echo ""

echo -e "${BOLD}Tips:${NC}"
echo "$RESPONSE" | jq -r '.recipe.tips[] | "  * \(.)"'
echo ""

echo -e "${DIM}$(echo "$RESPONSE" | jq '{usage}')${NC}"
echo ""
success "Done!"
