import type { Context } from "hono";
import { streamAgentResponse } from "../lib/stream-helpers.js";
import { runAgent } from "../lib/run-agent.js";
import type { AgentHandler } from "./agent-registry.js";

export function generateConversationId(existing?: string) {
  return existing ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface RegistryHandlerConfig {
  tools: Record<string, any>;
  maxSteps?: number;
}

export function makeRegistryStreamHandler(config: RegistryHandlerConfig): AgentHandler {
  return async (c: Context, { systemPrompt, memoryContext }) => {
    const { message, conversationId: cid, model } = await c.req.json();

    const system = memoryContext
      ? `${systemPrompt}\n\n## Memory Context\n${memoryContext}`
      : systemPrompt;

    return streamAgentResponse(c, {
      system,
      tools: config.tools,
      prompt: message,
      model,
      maxSteps: config.maxSteps,
      conversationId: generateConversationId(cid),
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
