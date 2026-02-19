import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import type { Context } from "hono";
import { streamText, stepCountIs } from "ai";
import { getModel } from "./ai-provider.js";

// ~4KB of SSE comments to fill proxy/VPN buffers and force forwarding
const PROXY_PADDING = ": proxy-buffer-padding\n".repeat(180) + "\n";

/**
 * Wrapper around Hono's streamSSE that adds anti-buffering headers and
 * padding for corporate proxies/VPNs.
 */
export function streamSSEWithPadding(
  c: Context,
  cb: (stream: SSEStreamingApi) => Promise<void>,
) {
  c.header("X-Accel-Buffering", "no");
  c.header("Cache-Control", "no-cache, no-transform");

  return streamSSE(c, async (stream) => {
    await stream.write(PROXY_PADDING);
    await cb(stream);
  });
}

interface AgentStreamConfig {
  system: string;
  tools: Record<string, any>;
  prompt: string;
  model?: string;
  maxSteps?: number;
  conversationId: string;
  extraDoneData?: Record<string, unknown>;
}

export function streamAgentResponse(c: Context, config: AgentStreamConfig) {
  const startTime = performance.now();
  const result = streamText({
    model: getModel(config.model),
    system: config.system,
    prompt: config.prompt,
    tools: config.tools,
    stopWhen: stepCountIs(config.maxSteps ?? 5),
  });

  return streamSSEWithPadding(c, async (stream) => {
    let id = 0;
    const toolsUsed = new Set<string>();

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        await stream.writeSSE({
          id: String(id++),
          event: "text-delta",
          data: JSON.stringify({ text: chunk.text }),
        });
      } else if (chunk.type === "tool-call") {
        toolsUsed.add(chunk.toolName);
        await stream.writeSSE({
          id: String(id++),
          event: "tool-call",
          data: JSON.stringify({
            toolName: chunk.toolName,
            args: chunk.input,
          }),
        });
      } else if (chunk.type === "tool-result") {
        await stream.writeSSE({
          id: String(id++),
          event: "tool-result",
          data: JSON.stringify({
            toolName: chunk.toolName,
            result: chunk.output,
          }),
        });
      }
    }

    // Await streaming promises for usage
    const usage = await result.usage;
    const durationMs = Math.round(performance.now() - startTime);
    const rawCost = usage?.raw?.cost;

    await stream.writeSSE({
      id: String(id++),
      event: "done",
      data: JSON.stringify({
        toolsUsed: [...toolsUsed],
        conversationId: config.conversationId,
        usage: {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          totalTokens:
            usage?.totalTokens ??
            (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
          cost: typeof rawCost === "number" ? rawCost : null,
          durationMs,
        },
        ...config.extraDoneData,
      }),
    });
  });
}
