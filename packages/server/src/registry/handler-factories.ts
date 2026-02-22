import type { Context } from "hono";
import { streamAgentResponse } from "../lib/stream-helpers.js";
import { runAgent } from "../lib/run-agent.js";
import type { AgentHandler } from "./agent-registry.js";
import { conversationStore } from "../storage/conversation-store.js";

export function generateConversationId(existing?: string) {
  return existing ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface RegistryHandlerConfig {
  tools: Record<string, any>;
  maxSteps?: number;
}

export function makeRegistryStreamHandler(config: RegistryHandlerConfig): AgentHandler {
  return async (c: Context, { systemPrompt, memoryContext }) => {
    const { message, messages, conversationId: cid, model } = await c.req.json();
    const convId = generateConversationId(cid);

    const system = memoryContext
      ? `${systemPrompt}\n\n## Memory Context\n${memoryContext}`
      : systemPrompt;

    // If a conversationId is provided, load history from the store
    let historyMessages: Array<{ role: "user" | "assistant"; content: string }> | undefined;
    if (cid) {
      const conv = await conversationStore.get(cid);
      if (conv) {
        // Append new user message to store
        await conversationStore.append(cid, {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        });
        // Build messages array for AI SDK (existing history + new user message)
        historyMessages = [
          ...conv.messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: message },
        ];
      }
    }

    // Determine what to pass: server-side history > client messages > single prompt
    const promptOrMessages = historyMessages
      ? { messages: historyMessages }
      : messages
        ? { messages }
        : { prompt: message };

    return streamAgentResponse(c, {
      system,
      tools: config.tools,
      ...promptOrMessages,
      model,
      maxSteps: config.maxSteps,
      conversationId: convId,
      onStreamComplete: cid
        ? async ({ text }) => {
            if (text) {
              await conversationStore.append(cid, {
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

export function makeRegistryJsonHandler(config: RegistryHandlerConfig): AgentHandler {
  return async (c: Context, { systemPrompt, memoryContext }) => {
    const { message, conversationId: cid, model } = await c.req.json();

    const system = memoryContext
      ? `${systemPrompt}\n\n## Memory Context\n${memoryContext}`
      : systemPrompt;

    const result = await runAgent(
      { system, tools: config.tools },
      message,
      model,
      config.maxSteps,
    );
    return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
  };
}

export function makeRegistryHandlers(config: RegistryHandlerConfig) {
  return {
    sseHandler: makeRegistryStreamHandler(config),
    jsonHandler: makeRegistryJsonHandler(config),
  };
}
