import { generateObject, generateText, streamText } from "ai";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { getModel, extractUsage, extractStreamUsage, mergeUsage } from "../lib/ai-provider.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { generateConversationId } from "../registry/handler-factories.js";

const classificationSchema = z.object({
  allowed: z.boolean().describe("Whether the query is a personal finance question"),
  category: z.enum([
    "budgeting",
    "investing",
    "debt",
    "savings",
    "taxes",
    "retirement",
    "off-topic",
  ]).describe("The finance category, or 'off-topic' if not finance-related"),
  reason: z.string().describe("Brief explanation of the classification decision"),
});

const CLASSIFICATION_PROMPT = `You are a content classifier for a personal finance advisor.
Your job is to determine whether the user's message is a personal finance question.

Allowed topics: budgeting, investing, debt management, savings, taxes, retirement planning.
Block anything unrelated to personal finance (cooking, sports, coding, general chat, etc.).

Classify the message and provide a brief reason for your decision.`;

const FINANCE_ADVISOR_PROMPT = `You are a knowledgeable personal finance advisor.
Provide clear, actionable advice based on the user's question.

Guidelines:
- Give practical, specific advice
- Mention relevant rules of thumb (e.g., 50/30/20 budget, emergency fund = 3-6 months expenses)
- Note when professional advice should be sought for complex situations
- Keep responses concise but thorough`;

export async function runGuardrailsAgent(message: string, model?: string) {
  const aiModel = getModel(model);

  // Phase 1: Classification
  const classifyStart = performance.now();
  const classification = await generateObject({
    model: aiModel,
    system: CLASSIFICATION_PROMPT,
    prompt: message,
    schema: classificationSchema,
  });
  const classifyUsage = extractUsage(classification, classifyStart);

  const { allowed, category, reason } = classification.object;

  // If blocked, return early with classification result only
  if (!allowed) {
    return { allowed, category, reason, usage: classifyUsage };
  }

  // Phase 2: Generate finance advice
  const adviceStart = performance.now();
  const advice = await generateText({
    model: aiModel,
    system: FINANCE_ADVISOR_PROMPT,
    prompt: message,
  });
  const adviceUsage = extractUsage(advice, adviceStart);

  const totalUsage = mergeUsage(classifyUsage, adviceUsage);
  totalUsage.durationMs = Math.round(performance.now() - classifyStart);

  return { allowed, category, reason, response: advice.text, usage: totalUsage };
}

/** Exported for the streaming SSE handler */
export const GUARDRAILS_CONFIG = {
  classificationSchema,
  classificationPrompt: CLASSIFICATION_PROMPT,
  advicePrompt: FINANCE_ADVISOR_PROMPT,
};

// Self-registration
agentRegistry.register({
  name: "guardrails",
  description: "Guardrails finance advisor: classifies input then generates advice for allowed queries",
  toolNames: [],
  defaultFormat: "json",
  defaultSystem: CLASSIFICATION_PROMPT,
  jsonHandler: async (c: Context) => {
    const { message, conversationId: cid, model } = await c.req.json();
    const result = await runGuardrailsAgent(message, model);
    return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
  },
  sseHandler: async (c: Context) => {
    const { message, conversationId: cid, model } = await c.req.json();
    const convId = generateConversationId(cid);
    const overallStart = performance.now();
    const aiModel = getModel(model);

    return streamSSE(c, async (stream) => {
      let id = 0;

      await stream.writeSSE({ id: String(id++), event: "status", data: JSON.stringify({ phase: "classifying" }) });

      const classifyStart = performance.now();
      const classification = await generateObject({
        model: aiModel,
        system: CLASSIFICATION_PROMPT,
        prompt: message,
        schema: classificationSchema,
      });
      const classifyUsage = extractUsage(classification, classifyStart);
      const { allowed, category, reason } = classification.object;

      await stream.writeSSE({ id: String(id++), event: "classification", data: JSON.stringify({ allowed, category, reason }) });

      if (!allowed) {
        await stream.writeSSE({
          id: String(id++),
          event: "done",
          data: JSON.stringify({ conversationId: convId, usage: { ...classifyUsage, durationMs: Math.round(performance.now() - overallStart) } }),
        });
        return;
      }

      await stream.writeSSE({ id: String(id++), event: "status", data: JSON.stringify({ phase: "generating advice" }) });

      const adviceStart = performance.now();
      const adviceResult = streamText({ model: aiModel, system: FINANCE_ADVISOR_PROMPT, prompt: message });

      for await (const text of adviceResult.textStream) {
        await stream.writeSSE({ id: String(id++), event: "text-delta", data: JSON.stringify({ text }) });
      }

      const adviceUsage = await adviceResult.usage;
      const adviceUsageInfo = extractStreamUsage(adviceUsage, adviceStart);
      const totalUsage = mergeUsage(classifyUsage, adviceUsageInfo);
      totalUsage.durationMs = Math.round(performance.now() - overallStart);

      await stream.writeSSE({ id: String(id++), event: "done", data: JSON.stringify({ conversationId: convId, usage: totalUsage }) });
    });
  },
});
