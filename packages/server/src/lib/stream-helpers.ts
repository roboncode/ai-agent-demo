import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { streamText, stepCountIs } from "ai";
import { getModel, extractStreamUsage } from "./ai-provider.js";
import { getEventBus, getAbortSignal } from "./delegation-context.js";
import { registerRequest, unregisterRequest } from "./request-registry.js";

interface AgentStreamConfig {
  system: string;
  tools: Record<string, any>;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  maxSteps?: number;
  conversationId: string;
  extraDoneData?: Record<string, unknown>;
  onStreamComplete?: (result: { text: string; toolCalls: string[] }) => Promise<void>;
}

export function streamAgentResponse(c: Context, config: AgentStreamConfig) {
  const startTime = performance.now();
  // Register for cancellation — use existing signal from delegation context, or create one
  let abortSignal = getAbortSignal();
  if (!abortSignal) {
    const controller = registerRequest(config.conversationId);
    abortSignal = controller.signal;
  }
  const promptOrMessages = config.messages
    ? { messages: [{ role: "system" as const, content: config.system }, ...config.messages] }
    : { system: config.system, prompt: config.prompt! };

  const result = streamText({
    model: getModel(config.model),
    ...promptOrMessages,
    tools: config.tools,
    stopWhen: stepCountIs(config.maxSteps ?? 5),
    abortSignal,
  });

  return streamSSE(c, async (stream) => {
    let id = 0;
    const toolsUsed = new Set<string>();
    const bus = getEventBus();
    let fullText = "";

    // Emit session:start so the client knows the conversationId for cancellation
    await stream.writeSSE({
      id: String(id++),
      event: "session:start",
      data: JSON.stringify({ conversationId: config.conversationId }),
    });

    try {
      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          fullText += chunk.text;
          bus?.emit("text:delta", { text: chunk.text });
          await stream.writeSSE({
            id: String(id++),
            event: "text-delta",
            data: JSON.stringify({ text: chunk.text }),
          });
        } else if (chunk.type === "tool-call") {
          toolsUsed.add(chunk.toolName);
          bus?.emit("tool:call", { tool: chunk.toolName, args: chunk.input });
          await stream.writeSSE({
            id: String(id++),
            event: "tool-call",
            data: JSON.stringify({
              toolName: chunk.toolName,
              args: chunk.input,
            }),
          });
        } else if (chunk.type === "tool-result") {
          bus?.emit("tool:result", { tool: chunk.toolName, result: chunk.output });
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

      if (config.onStreamComplete) {
        await config.onStreamComplete({ text: fullText, toolCalls: [...toolsUsed] });
      }

      const usage = await result.usage;
      const usageInfo = extractStreamUsage(usage, startTime);

      await stream.writeSSE({
        id: String(id++),
        event: "done",
        data: JSON.stringify({
          toolsUsed: [...toolsUsed],
          conversationId: config.conversationId,
          usage: usageInfo,
          ...config.extraDoneData,
        }),
      });
    } catch (err: any) {
      if (err.name === "AbortError" || abortSignal?.aborted) {
        await stream.writeSSE({
          id: String(id++),
          event: "cancelled",
          data: JSON.stringify({ conversationId: config.conversationId }),
        });
      } else {
        throw err;
      }
    } finally {
      unregisterRequest(config.conversationId);
    }
  });
}
