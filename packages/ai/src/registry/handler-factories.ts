import type { Context } from "hono";
import type { PluginContext } from "../context.js";
import type { AgentHandler } from "./agent-registry.js";

export function generateConversationId(existing?: string) {
  return existing ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface RegistryHandlerConfig {
  tools: Record<string, any>;
  maxSteps?: number;
}

export function makeRegistryStreamHandler(config: RegistryHandlerConfig, ctx: PluginContext): AgentHandler {
  return async (c: Context, { systemPrompt, memoryContext }) => {
    const { streamAgentResponse } = await import("../lib/stream-helpers.js");
    const { message, messages, conversationId: cid, model } = await c.req.json();
    const convId = generateConversationId(cid);

    const system = memoryContext
      ? `${systemPrompt}\n\n## Memory Context\n${memoryContext}`
      : systemPrompt;

    // If a conversationId is provided, load history from the store
    let historyMessages: Array<{ role: "user" | "assistant"; content: string }> | undefined;
    if (cid) {
      const conv = await ctx.storage.conversations.get(cid);
      if (conv) {
        await ctx.storage.conversations.append(cid, {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        });
        historyMessages = [
          ...conv.messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: message },
        ];
      }
    }

    const promptOrMessages = historyMessages
      ? { messages: historyMessages }
      : messages
        ? { messages }
        : { prompt: message };

    return streamAgentResponse(c, ctx, {
      system,
      tools: config.tools,
      ...promptOrMessages,
      model,
      maxSteps: config.maxSteps,
      conversationId: convId,
      onStreamComplete: cid
        ? async ({ text }) => {
            if (text) {
              await ctx.storage.conversations.append(cid, {
                role: "assistant",
                content: text,
                timestamp: new Date().toISOString(),
              });
            }
          }
        : undefined,
    });
  };
}

export function makeRegistryJsonHandler(config: RegistryHandlerConfig, ctx: PluginContext): AgentHandler {
  return async (c: Context, { systemPrompt, memoryContext }) => {
    const { runAgent } = await import("../lib/run-agent.js");
    const { message, conversationId: cid, model } = await c.req.json();

    const system = memoryContext
      ? `${systemPrompt}\n\n## Memory Context\n${memoryContext}`
      : systemPrompt;

    const result = await runAgent(
      ctx,
      { system, tools: config.tools },
      message,
      model,
      config.maxSteps,
    );
    return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
  };
}

export function makeRegistryHandlers(config: RegistryHandlerConfig, ctx: PluginContext) {
  return {
    sseHandler: makeRegistryStreamHandler(config, ctx),
    jsonHandler: makeRegistryJsonHandler(config, ctx),
  };
}
