import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { generateText, streamText, stepCountIs } from "ai";
import { getModel, extractUsage, extractStreamUsage } from "../../lib/ai-provider.js";
import { allTools, getToolsByNames, type ToolName } from "../../tools/index.js";
import { env } from "../../env.js";

const VALID_TOOL_NAMES = new Set(Object.keys(allTools));

function validateToolNames(names: string[]): string[] {
  return names.filter((n) => !VALID_TOOL_NAMES.has(n));
}

export async function handleGenerate(c: Context) {
  const body = await c.req.json();
  const { prompt, systemPrompt, model, tools: toolNames, maxSteps } = body;

  if (toolNames?.length) {
    const unknown = validateToolNames(toolNames);
    if (unknown.length > 0) {
      return c.json({ error: `Unknown tool(s): ${unknown.join(", ")}` }, 400);
    }
  }

  const tools = toolNames?.length
    ? getToolsByNames(toolNames as ToolName[])
    : undefined;

  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: systemPrompt,
    prompt,
    tools,
    stopWhen: tools ? stepCountIs(maxSteps ?? 5) : undefined,
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

  if (toolNames?.length) {
    const unknown = validateToolNames(toolNames);
    if (unknown.length > 0) {
      return c.json({ error: `Unknown tool(s): ${unknown.join(", ")}` }, 400);
    }
  }

  const tools = toolNames?.length
    ? getToolsByNames(toolNames as ToolName[])
    : undefined;

  const startTime = performance.now();
  const result = streamText({
    model: getModel(model),
    system: systemPrompt,
    prompt,
    tools,
    stopWhen: tools ? stepCountIs(maxSteps ?? 5) : undefined,
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
