#!/bin/bash
# Demo: Voice transcription (STT)
source "$(dirname "$0")/config.sh"

header "Voice Transcribe (STT)"
info "POST /api/voice/transcribe"
info "Transcribes an audio file to text using OpenAI Whisper"
echo ""

# Check for audio file argument
AUDIO_FILE="${1:-}"
if [ -z "$AUDIO_FILE" ]; then
  warn "Usage: $0 <audio-file>"
  warn "Example: $0 recording.webm"
  echo ""
  info "No audio file provided — testing with speakers endpoint instead."
  echo ""

  info "GET /api/voice/speakers"
  curl -s "$BASE_URL/api/voice/speakers" \
    -H "X-API-Key: $API_KEY" | jq .

  echo ""
  success "Done!"
  exit 0
fi

info "Transcribing: $AUDIO_FILE"
echo ""

curl -s "$BASE_URL/api/voice/transcribe" \
  -H "X-API-Key: $API_KEY" \
  -F "audio=@$AUDIO_FILE" | jq .

echo ""
success "Done!"
