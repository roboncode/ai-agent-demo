import { env } from "./env";
import { parseSseStream, type SseEvent } from "./sse-parser";

function getBaseUrl(): string {
  // In dev with Vite proxy, use relative URLs
  // Otherwise, use the full URL (e.g. http://localhost:3000)
  return env.VITE_API_URL === "http://localhost:3000" ? "" : env.VITE_API_URL;
}

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "X-API-Key": env.VITE_API_KEY,
    ...extra,
  };
}

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export interface Speaker {
  voiceId: string;
  name: string;
}

export interface SpeakOptions {
  speaker?: string;
  format?: string;
  speed?: number;
}

export async function transcribe(audioBlob: Blob): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");

  const res = await fetch(`${getBaseUrl()}/api/voice/transcribe`, {
    method: "POST",
    headers: getHeaders(),
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Transcribe failed: ${res.status}`);
  }

  return res.json();
}

export async function speak(text: string, options?: SpeakOptions): Promise<Blob> {
  const res = await fetch(`${getBaseUrl()}/api/voice/speak`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      text,
      speaker: options?.speaker,
      format: options?.format ?? "mp3",
      speed: options?.speed,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Speak failed: ${res.status}`);
  }

  return res.blob();
}

export async function getSpeakers(): Promise<Speaker[]> {
  const res = await fetch(`${getBaseUrl()}/api/voice/speakers`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Get speakers failed: ${res.status}`);
  }

  const data = await res.json();
  return data.speakers;
}

export type { SseEvent };

export async function* streamSupervisor(
  message: string,
  options?: { conversationId?: string },
): AsyncGenerator<SseEvent> {
  const res = await fetch(`${getBaseUrl()}/api/agents/supervisor?format=sse`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      ...(options?.conversationId && { conversationId: options.conversationId }),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Supervisor stream failed: ${res.status}`);
  }

  yield* parseSseStream(res);
}
