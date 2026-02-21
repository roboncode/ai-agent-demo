import type {
  VoiceProvider,
  TranscribeOptions,
  TranscribeResult,
  SpeakOptions,
  VoiceSpeaker,
} from "./voice-provider.js";

const OPENAI_BASE = "https://api.openai.com/v1";

const VOICES: VoiceSpeaker[] = [
  { voiceId: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { voiceId: "echo", name: "Echo", description: "Warm and clear" },
  { voiceId: "fable", name: "Fable", description: "Expressive and animated" },
  { voiceId: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { voiceId: "nova", name: "Nova", description: "Friendly and upbeat" },
  { voiceId: "shimmer", name: "Shimmer", description: "Gentle and calm" },
];

export interface OpenAIVoiceProviderConfig {
  apiKey: string;
  ttsModel?: string;
  sttModel?: string;
  defaultSpeaker?: string;
}

export class OpenAIVoiceProvider implements VoiceProvider {
  readonly name = "openai";

  private apiKey: string;
  private ttsModel: string;
  private sttModel: string;
  private defaultSpeaker: string;

  constructor(config: OpenAIVoiceProviderConfig) {
    this.apiKey = config.apiKey;
    this.ttsModel = config.ttsModel ?? "tts-1";
    this.sttModel = config.sttModel ?? "whisper-1";
    this.defaultSpeaker = config.defaultSpeaker ?? "alloy";
  }

  async transcribe(
    audio: Blob | Buffer,
    options?: TranscribeOptions,
  ): Promise<TranscribeResult> {
    const form = new FormData();

    const blob = audio instanceof Blob
      ? audio
      : new Blob([audio], { type: "audio/webm" });
    form.append("file", blob, "audio.webm");

    form.append("model", options?.model ?? this.sttModel);

    if (options?.language) {
      form.append("language", options.language);
    }
    if (options?.prompt) {
      form.append("prompt", options.prompt);
    }

    form.append("response_format", "verbose_json");

    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI STT failed (${res.status}): ${error}`);
    }

    const data = await res.json();

    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
    };
  }

  async speak(
    text: string,
    options?: SpeakOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const format = options?.format ?? "mp3";
    const speaker = options?.speaker ?? this.defaultSpeaker;
    const speed = options?.speed ?? 1.0;

    const res = await fetch(`${OPENAI_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model ?? this.ttsModel,
        input: text,
        voice: speaker,
        response_format: format,
        speed,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI TTS failed (${res.status}): ${error}`);
    }

    if (!res.body) {
      throw new Error("OpenAI TTS returned no body");
    }

    return res.body as ReadableStream<Uint8Array>;
  }

  async getSpeakers(): Promise<VoiceSpeaker[]> {
    return VOICES;
  }
}
