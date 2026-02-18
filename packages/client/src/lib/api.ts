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
