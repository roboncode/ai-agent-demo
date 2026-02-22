import { env } from "../env";

function getBaseUrl(): string {
  // In dev with Vite proxy, use relative URLs
  // In production or when VITE_API_URL differs, use the full URL
  return env.VITE_API_URL === "http://localhost:3000" ? "" : env.VITE_API_URL;
}

function getHeaders(
  extra?: Record<string, string>,
  skipAuth?: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (!skipAuth) {
    headers["X-API-Key"] = env.VITE_API_KEY;
  }
  return headers;
}

export async function postJson<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  options?: { headers?: Record<string, string>; skipAuth?: boolean },
): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: getHeaders(options?.headers, options?.skipAuth),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), {
      status: res.status,
      data,
    });
  }
  return data as T;
}

export async function deleteJson<T = unknown>(
  endpoint: string,
): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), {
      status: res.status,
      data,
    });
  }
  return data as T;
}

export async function postSse(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), {
      status: res.status,
      data,
    });
  }

  return res;
}

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");

  const res = await fetch(`${getBaseUrl()}/api/voice/transcribe?provider=groq`, {
    method: "POST",
    headers: { "X-API-Key": env.VITE_API_KEY },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Transcribe failed: ${res.status}`);
  }

  return res.json();
}

export async function speakText(text: string, speaker = "fable"): Promise<Blob> {
  const res = await fetch(`${getBaseUrl()}/api/voice/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.VITE_API_KEY,
    },
    body: JSON.stringify({ text, speaker, format: "mp3", save: false }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Speak failed: ${res.status}`);
  }

  return res.blob();
}

let _streamMode: "sse" | "ws" | null = null;

export function getStreamMode(): "sse" | "ws" {
  if (_streamMode) return _streamMode;
  const stored = localStorage.getItem("stream-mode");
  if (stored === "sse" || stored === "ws") {
    _streamMode = stored;
    return stored;
  }
  return "sse";
}

export function setStreamMode(mode: "sse" | "ws") {
  _streamMode = mode;
  localStorage.setItem("stream-mode", mode);
}
