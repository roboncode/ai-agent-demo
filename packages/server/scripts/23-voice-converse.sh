#!/bin/bash
# Demo: Full voice conversation (audio in → agent → audio out)
source "$(dirname "$0")/config.sh"

header "Voice Converse (Full Cycle)"
info "POST /api/voice/converse"
info "Transcribes audio → runs supervisor agent → returns spoken response"
echo ""

AUDIO_FILE="${1:-}"
OUTPUT="${2:-/tmp/voice-converse-output.mp3}"
SPEAKER="${3:-alloy}"

if [ -z "$AUDIO_FILE" ]; then
  warn "Usage: $0 <audio-file> [output-file] [speaker]"
  warn "Example: $0 question.webm /tmp/response.mp3 nova"
  exit 1
fi

info "Input: $AUDIO_FILE"
info "Speaker: $SPEAKER"
info "Output: $OUTPUT"
echo ""

# Use -D to dump response headers to a temp file
HEADERS_FILE=$(mktemp)

curl -s "$BASE_URL/api/voice/converse" \
  -H "X-API-Key: $API_KEY" \
  -F "audio=@$AUDIO_FILE" \
  -F "speaker=$SPEAKER" \
  -D "$HEADERS_FILE" \
  -o "$OUTPUT"

# Parse metadata from response headers
TRANSCRIPTION=$(grep -i "X-Transcription:" "$HEADERS_FILE" | sed 's/^[^:]*: //' | tr -d '\r')
RESPONSE_TEXT=$(grep -i "X-Response-Text:" "$HEADERS_FILE" | sed 's/^[^:]*: //' | tr -d '\r')
CONV_ID=$(grep -i "X-Conversation-Id:" "$HEADERS_FILE" | sed 's/^[^:]*: //' | tr -d '\r')

rm -f "$HEADERS_FILE"

if [ -n "$TRANSCRIPTION" ]; then
  echo -e "${CYAN}${BOLD}You said:${NC}"
  # URL-decode the transcription
  echo -e "${CYAN}$(printf '%b' "${TRANSCRIPTION//%/\\x}")${NC}"
  echo ""
fi

if [ -n "$RESPONSE_TEXT" ]; then
  echo -e "${GREEN}${BOLD}Agent said:${NC}"
  echo -e "${GREEN}$(printf '%b' "${RESPONSE_TEXT//%/\\x}")${NC}"
  echo ""
fi

if [ -n "$CONV_ID" ]; then
  info "Conversation ID: $CONV_ID"
fi

if [ -f "$OUTPUT" ] && [ -s "$OUTPUT" ]; then
  FILE_SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
  success "Audio response saved to $OUTPUT ($FILE_SIZE bytes)"

  if command -v afplay &> /dev/null; then
    info "Playing response..."
    afplay "$OUTPUT"
  fi
else
  warn "Failed to get audio response"
fi

echo ""
success "Done!"
