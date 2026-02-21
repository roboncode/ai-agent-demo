import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { generateText, streamText, stepCountIs } from "ai";
import { getModel, extractUsage, extractStreamUsage } from "../../lib/ai-provider.js";
import { getToolsByNames, type ToolName } from "../../tools/index.js";
import { env } from "../../env.js";

export async function handleGenerate(c: Context) {
  const body = await c.req.json();
  const { prompt, systemPrompt, model, tools: toolNames, maxSteps } = body;

  const selectedTools = toolNames?.length ? getToolsByNames(toolNames) : undefined;

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
    model: model ?? env.DEFAULT_MODEL,
    usage: extractUsage(result, startTime),
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    finishReason: result.finishReason,
  }, 200);
}

export async function handleGenerateStream(c: Context) {
  const body = await c.req.json();
  const { prompt, systemPrompt, model, tools: toolNames, maxSteps } = body;

  const selectedTools = toolNames?.length ? getToolsByNames(toolNames) : undefined;

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

    const usage = await result.usage;
    const usageInfo = extractStreamUsage(usage, startTime);

    await stream.writeSSE({
      id: String(id++),
      event: "done",
      data: JSON.stringify({
        finishReason: await result.finishReason,
        usage: usageInfo,
      }),
    });
  });
}
