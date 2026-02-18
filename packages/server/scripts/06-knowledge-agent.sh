#!/bin/bash
# Demo: Knowledge base agent (Movies via TMDB)
source "$(dirname "$0")/config.sh"

header "Knowledge Agent (Movies)"
info "POST /api/agents/knowledge"
info "Specialist agent with TMDB movie tools"
echo ""

show_system_prompt "You are a movie knowledge and recommendation agent. Your job is to help users discover movies, get details, and receive personalized recommendations.

When asked about movies:
1. Use searchMovies to find movies matching the user's interests
2. Use getMovieDetail to provide in-depth information about specific movies
3. Make thoughtful recommendations based on genres, ratings, and user preferences
4. Share interesting facts about movies, directors, and casts

Present information in an engaging, film-critic style."

show_user_prompt "Who are the top three main characters in the TV show Lost and which actors played them?"

stream_sse "$BASE_URL/api/agents/knowledge" '{
    "message": "Who are the top three main characters in the TV show Lost and which actors played them?"
  }'

echo ""
success "Done!"
