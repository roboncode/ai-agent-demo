#!/bin/bash
# Demo: Voice text-to-speech (TTS)
source "$(dirname "$0")/config.sh"

header "Voice Speak (TTS)"
info "POST /api/voice/speak"
info "Converts text to speech using OpenAI TTS"
echo ""

TEXT="${1:-Hello! I am the AI supervisor agent. How can I help you today?}"
OUTPUT="${2:-/tmp/voice-speak-output.mp3}"
SPEAKER="${3:-alloy}"

show_user_prompt "$TEXT"
info "Speaker: $SPEAKER"
info "Output: $OUTPUT"
echo ""

curl -s "$BASE_URL/api/voice/speak" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TEXT\", \"speaker\": \"$SPEAKER\"}" \
  -o "$OUTPUT"

if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
  FILE_SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
  success "Audio saved to $OUTPUT ($FILE_SIZE bytes)"

  # Try to play on macOS
  if command -v afplay &> /dev/null; then
    info "Playing audio..."
    afplay "$OUTPUT"
  else
    info "Use 'open $OUTPUT' or your preferred player to listen"
  fi
else
  warn "Failed to generate audio"
fi

echo ""
success "Done!"
