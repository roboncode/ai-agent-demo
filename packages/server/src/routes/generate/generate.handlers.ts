import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { generateText, streamText } from "ai";
import { getModel } from "../../lib/ai-provider.js";
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

  const result = await generateText({
    model: getModel(model),
    system: systemPrompt,
    prompt,
    tools: selectedTools,
    maxSteps: selectedTools ? (maxSteps ?? 5) : undefined,
  });

  const toolResults = result.steps
    .flatMap((step) => step.toolResults)
    .filter(Boolean);

  return c.json({
    text: result.text,
    model: model ?? "openai/gpt-4o-mini",
    usage: {
      promptTokens: result.usage?.promptTokens ?? 0,
      completionTokens: result.usage?.completionTokens ?? 0,
      totalTokens:
        (result.usage?.promptTokens ?? 0) +
        (result.usage?.completionTokens ?? 0),
    },
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    finishReason: result.finishReason,
  });
}

export async function handleGenerateStream(c: Context) {
  const body = await c.req.json();
  const { prompt, systemPrompt, model, tools: toolNames, maxSteps } = body;

  const selectedTools = pickTools(toolNames);

  const result = streamText({
    model: getModel(model),
    system: systemPrompt,
    prompt,
    tools: selectedTools,
    maxSteps: selectedTools ? (maxSteps ?? 5) : undefined,
  });

  return streamSSE(c, async (stream) => {
    let id = 0;

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        await stream.writeSSE({
          id: String(id++),
          event: "text-delta",
          data: JSON.stringify({ text: chunk.textDelta }),
        });
      } else if (chunk.type === "tool-result") {
        await stream.writeSSE({
          id: String(id++),
          event: "tool-result",
          data: JSON.stringify({
            toolName: chunk.toolName,
            result: chunk.result,
          }),
        });
      } else if (chunk.type === "finish") {
        await stream.writeSSE({
          id: String(id++),
          event: "done",
          data: JSON.stringify({
            finishReason: chunk.finishReason,
            usage: chunk.usage,
          }),
        });
      }
    }
  });
}
