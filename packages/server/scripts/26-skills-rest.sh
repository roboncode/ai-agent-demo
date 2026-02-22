#!/bin/bash
# Demo: Skills REST API - CRUD operations on behavioral skills
source "$(dirname "$0")/config.sh"

header "Skills REST API"
info "CRUD operations on the skills store"
echo ""

# Step 1: List all skills
echo -e "${YELLOW}Step 1: GET /api/skills - List all skills${NC}"
echo ""

curl -s "$BASE_URL/api/skills" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""

# Step 2: Get a specific skill
echo -e "${YELLOW}Step 2: GET /api/skills/eli5 - Get a specific skill${NC}"
echo ""

curl -s "$BASE_URL/api/skills/eli5" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""

# Step 3: Create a new skill
echo -e "${YELLOW}Step 3: POST /api/skills - Create a new skill${NC}"
echo ""

curl -s -X POST "$BASE_URL/api/skills" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "formal-writing",
    "content": "---\nname: formal-writing\ndescription: Use when the user asks for professional, formal, or business-appropriate writing\ntags: [formal, professional, business]\n---\n\n# Formal Writing\n\n## When to Use\n\n- User asks for professional or business tone\n- User needs a formal email, report, or document\n\n## Instructions\n\n1. Use complete sentences and proper grammar\n2. Avoid contractions and slang\n3. Maintain a neutral, professional tone\n4. Structure content with clear headings and paragraphs"
  }' | jq .

echo ""

# Step 4: Verify it was created
echo -e "${YELLOW}Step 4: GET /api/skills - Verify creation (should show 5 skills)${NC}"
echo ""

curl -s "$BASE_URL/api/skills" \
  -H "X-API-Key: $API_KEY" | jq '.count'

echo ""

# Step 5: Update the skill
echo -e "${YELLOW}Step 5: PUT /api/skills/formal-writing - Update the skill${NC}"
echo ""

curl -s -X PUT "$BASE_URL/api/skills/formal-writing" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "---\nname: formal-writing\ndescription: Use when the user asks for professional, formal, or business-appropriate writing\ntags: [formal, professional, business, academic]\n---\n\n# Formal Writing\n\n## When to Use\n\n- User asks for professional or business tone\n- User needs a formal email, report, or document\n- Academic or technical writing contexts\n\n## Instructions\n\n1. Use complete sentences and proper grammar\n2. Avoid contractions and slang\n3. Maintain a neutral, professional tone\n4. Structure content with clear headings and paragraphs\n5. Use precise, domain-appropriate vocabulary"
  }' | jq '.tags'

echo ""

# Step 6: Delete the test skill
echo -e "${YELLOW}Step 6: DELETE /api/skills/formal-writing - Clean up${NC}"
echo ""

curl -s -X DELETE "$BASE_URL/api/skills/formal-writing" \
  -H "X-API-Key: $API_KEY" | jq .

echo ""

# Step 7: Verify deletion
echo -e "${YELLOW}Step 7: GET /api/skills - Verify deletion (should show 4 skills)${NC}"
echo ""

curl -s "$BASE_URL/api/skills" \
  -H "X-API-Key: $API_KEY" | jq '.count'

echo ""
success "Done!"
