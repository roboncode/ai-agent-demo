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

  isAvailable(): boolean {
    return this.providers.size > 0;
  }
}

export const voiceManager = new VoiceManager();

export function initializeVoice() {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("Voice: OPENAI_API_KEY not set, voice features disabled");
    return;
  }

  const provider = new OpenAIVoiceProvider({
    apiKey,
    ttsModel: env.VOICE_TTS_MODEL,
    sttModel: env.VOICE_STT_MODEL,
    defaultSpeaker: env.VOICE_DEFAULT_SPEAKER,
  });

  voiceManager.register(provider);
  console.log("Voice: OpenAI provider initialized");
}
