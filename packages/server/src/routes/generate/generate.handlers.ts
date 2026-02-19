import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { generateText, streamText, stepCountIs } from "ai";
import { getModel, extractUsage } from "../../lib/ai-provider.js";
import { allTools, type ToolName } from "../../tools/index.js";

function pickTools(toolNames?: ToolName[]) {
  if (!toolNames || toolNames.length === 0) return undefined;
  const tools: Record<string, (typeof allTools)[ToolName]> = {};
  for (const name of toolNames) {
    if (allTools[name]) tools[name] = allTools[name];
  }
  return tools;
}

export async function handleGenerate(c: Context) {
  const body = await c.req.json();
  const { prompt, systemPrompt, model, tools: toolNames, maxSteps } = body;

  const selectedTools = pickTools(toolNames);

  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: systemPrompt,
    prompt,
    tools: selectedTools,
    stopWhen: selectedTools ? stepCountIs(maxSteps ?? 5) : undefined,
  });

  const toolResults = result.steps
    .flatMap((step) => step.toolResults)
    .filter(Boolean);

  return c.json({
    text: result.text,
    model: model ?? "openai/gpt-4o-mini",
    usage: extractUsage(result, startTime),
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    finishReason: result.finishReason,
  }, 200);
}

export async function handleGenerateStream(c: Context) {
  const body = await c.req.json();
  const { prompt, systemPrompt, model, tools: toolNames, maxSteps } = body;

  const selectedTools = pickTools(toolNames);

  const startTime = performance.now();
  const result = streamText({
    model: getModel(model),
    system: systemPrompt,
    prompt,
    tools: selectedTools,
    stopWhen: selectedTools ? stepCountIs(maxSteps ?? 5) : undefined,
  });

  return streamSSE(c, async (stream) => {
    let id = 0;

    for await (const text of result.textStream) {
      await stream.writeSSE({
        id: String(id++),
        event: "text-delta",
        data: JSON.stringify({ text }),
      });
    }

    // After stream completes, send final event with usage
    const usage = await result.usage;
    const durationMs = Math.round(performance.now() - startTime);
    const rawCost = usage?.raw?.cost;

    await stream.writeSSE({
      id: String(id++),
      event: "done",
      data: JSON.stringify({
        finishReason: "stop",
        usage: {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          totalTokens: usage?.totalTokens ?? ((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)),
          cost: typeof rawCost === "number" ? rawCost : null,
          durationMs,
        },
      }),
    });
  });
}
