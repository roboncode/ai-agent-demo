import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "../../app.js";
import { env } from "../../env.js";

export interface WsData {
  authenticated: boolean;
}

// Allowlisted endpoint prefixes for WS routing
const ALLOWED_ENDPOINT_PREFIXES = [
  "/api/agents/",
  "/api/generate",
  "/api/tools/",
];

function isAllowedEndpoint(endpoint: string): boolean {
  return ALLOWED_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

/**
 * Create Bun WebSocket handlers that bridge WS messages to internal SSE endpoints.
 *
 * Protocol:
 *  1. Client sends  { type: "auth", key: "<api-key>" }
 *  2. Server replies { type: "auth", success: true }
 *  3. Client sends  { type: "request", endpoint: "/api/agents/weather", body: {...} }
 *  4. Server streams { event: "text-delta", data: "..." } messages
 *  5. After "done" event, server closes the connection
 */
export function createWebSocketHandler(app: OpenAPIHono<AppBindings>) {
  async function handleRequest(
    ws: { send: (msg: string) => void; close: () => void },
    endpoint: string,
    body: Record<string, unknown>,
  ) {
    try {
      if (!isAllowedEndpoint(endpoint)) {
        ws.send(JSON.stringify({ type: "error", error: "Endpoint not allowed" }));
        ws.close();
        return;
      }
      // In-process fetch — no network hop
      const internalReq = new Request(`http://localhost${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": env.API_KEY,
        },
        body: JSON.stringify(body),
      });

      const response = await app.fetch(internalReq);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}` }));
        ws.send(JSON.stringify({ type: "error", data: errorData }));
        ws.close();
        return;
      }

      // Parse SSE stream from internal response and forward as WS messages
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let currentData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData = line.slice(5).trim();
          } else if (line === "") {
            if (currentEvent && currentData) {
              ws.send(
                JSON.stringify({ event: currentEvent, data: currentData }),
              );
              if (currentEvent === "done") {
                ws.close();
                return;
              }
            }
            currentEvent = "";
            currentData = "";
          }
        }
      }

      // Flush any remaining partial event
      if (currentEvent && currentData) {
        ws.send(JSON.stringify({ event: currentEvent, data: currentData }));
      }
      ws.close();
    } catch (err: any) {
      ws.send(
        JSON.stringify({ type: "error", data: { error: err.message } }),
      );
      ws.close();
    }
  }

  return {
    open(_ws: { data: WsData }) {
      // Connection opened — waiting for auth message
    },

    async message(
      ws: { data: WsData; send: (msg: string) => void; close: () => void },
      message: string | Buffer,
    ) {
      try {
        const raw =
          typeof message === "string"
            ? message
            : new TextDecoder().decode(message);
        const msg = JSON.parse(raw);

        if (msg.type === "auth") {
          if (msg.key === env.API_KEY) {
            ws.data.authenticated = true;
            ws.send(JSON.stringify({ type: "auth", success: true }));
          } else {
            ws.send(
              JSON.stringify({
                type: "auth",
                success: false,
                error: "Invalid API key",
              }),
            );
            ws.close();
          }
        } else if (msg.type === "request") {
          if (!ws.data.authenticated) {
            ws.send(
              JSON.stringify({ type: "error", error: "Not authenticated" }),
            );
            return;
          }
          await handleRequest(ws, msg.endpoint, msg.body);
        }
      } catch {
        ws.send(
          JSON.stringify({ type: "error", error: "Invalid message format" }),
        );
      }
    },

    close(_ws: { data: WsData }) {
      // Connection closed
    },
  };
}
