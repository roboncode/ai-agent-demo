import type { VoiceProvider } from "./voice-provider.js";
import { OpenAIVoiceProvider } from "./openai-voice-provider.js";
import { env } from "../env.js";

class VoiceManager {
  private providers = new Map<string, VoiceProvider>();
  private defaultProvider: string | null = null;

  register(provider: VoiceProvider) {
    this.providers.set(provider.name, provider);
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name;
    }
  }

  get(name?: string): VoiceProvider | undefined {
    return this.providers.get(name ?? this.defaultProvider ?? "");
  }

  list(): VoiceProvider[] {
    return [...this.providers.values()];
  }

  listNames(): string[] {
    return [...this.providers.keys()];
  }

  getDefault(): string | null {
    return this.defaultProvider;
  }

  isAvailable(): boolean {
    return this.providers.size > 0;
  }
}

export const voiceManager = new VoiceManager();

export function initializeVoice() {
  const openaiKey = env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.log("Voice: OPENAI_API_KEY not set, voice features disabled");
    return;
  }

  const openai = new OpenAIVoiceProvider({
    apiKey: openaiKey,
    ttsModel: env.VOICE_TTS_MODEL,
    sttModel: env.VOICE_STT_MODEL,
    defaultSpeaker: env.VOICE_DEFAULT_SPEAKER,
  });

  voiceManager.register(openai);
  console.log("Voice: OpenAI provider initialized (stt: %s)", env.VOICE_STT_MODEL);

  // Register Groq as a transcription-only provider (uses OpenAI-compatible API)
  const groqKey = env.GROQ_API_KEY;
  if (groqKey) {
    const groq = new OpenAIVoiceProvider({
      name: "groq",
      label: "Groq",
      apiKey: groqKey,
      baseUrl: "https://api.groq.com/openai/v1",
      sttModel: "whisper-large-v3-turbo",
      // TTS not supported on Groq — fall back to OpenAI for speak()
      ttsModel: "tts-1",
      defaultSpeaker: env.VOICE_DEFAULT_SPEAKER,
    });

    voiceManager.register(groq);
    console.log("Voice: Groq provider initialized (stt: whisper-large-v3-turbo)");
  }
}
