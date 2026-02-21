import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { streamText, stepCountIs } from "ai";
import { getModel, extractStreamUsage } from "./ai-provider.js";

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

  return streamSSE(c, async (stream) => {
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
  });
}
