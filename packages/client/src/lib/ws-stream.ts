import type { SseEvent } from "./sse-parser";
import { env } from "../env";

/**
 * Open a WebSocket to /api/ws, authenticate, send the request,
 * and yield SSE-shaped events as they arrive.
 */
export async function* wsStream(
  endpoint: string,
  body: Record<string, unknown>,
): AsyncGenerator<SseEvent> {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/api/ws`;
  const ws = new WebSocket(wsUrl);

  const queue: SseEvent[] = [];
  let resolve: (() => void) | null = null;
  let done = false;
  let error: Error | null = null;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "auth", key: env.VITE_API_KEY }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "auth") {
      if (msg.success) {
        ws.send(JSON.stringify({ type: "request", endpoint, body }));
      } else {
        error = new Error(msg.error || "Authentication failed");
        done = true;
        resolve?.();
      }
      return;
    }

    if (msg.type === "error") {
      error = new Error(msg.error || msg.data?.error || "WebSocket error");
      done = true;
      resolve?.();
      return;
    }

    // SSE event forwarded from server
    if (msg.event) {
      queue.push({ event: msg.event, data: msg.data });
      if (msg.event === "done") {
        done = true;
      }
      resolve?.();
    }
  };

  ws.onclose = () => {
    done = true;
    resolve?.();
  };

  ws.onerror = () => {
    error = new Error("WebSocket connection error");
    done = true;
    resolve?.();
  };

  try {
    while (true) {
      if (queue.length > 0) {
        const event = queue.shift()!;
        yield event;
        if (event.event === "done") return;
        continue;
      }

      if (done) {
        if (error) throw error;
        return;
      }

      await new Promise<void>((r) => {
        resolve = r;
      });
      resolve = null;
    }
  } finally {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }
}
