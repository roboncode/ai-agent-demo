import { generateText, stepCountIs } from "ai";
import { extractUsage } from "./ai-provider.js";
import { getEventBus, getAbortSignal } from "./delegation-context.js";
import { TOOL_NAMES } from "./constants.js";
import { BUS_EVENTS } from "./events.js";
import { withResilience } from "./resilience.js";

const BUILT_IN_TOOLS: Set<string> = new Set([TOOL_NAMES.CLARIFY, TOOL_NAMES.MEMORY]);
import type { ClarifyItem } from "../agents/execute-task.js";
import type { PluginContext } from "../context.js";

interface AgentConfig {
  system: string;
  tools: Record<string, any>;
  agentName?: string;
}

export async function runAgent(
  ctx: PluginContext,
  config: AgentConfig,
  message: string,
  model?: string,
  maxSteps = ctx.defaultMaxSteps,
) {
  const startTime = performance.now();
  const abortSignal = getAbortSignal();
  const result = await withResilience({
    fn: (overrideModel) => generateText({
      model: ctx.getModel(overrideModel ?? model),
      system: config.system,
      prompt: message,
      tools: config.tools,
      stopWhen: stepCountIs(maxSteps),
      abortSignal,
    }),
    ctx,
    agent: config.agentName,
    modelId: model,
    abortSignal,
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName)
    .filter((t) => !BUILT_IN_TOOLS.has(t));

  const bus = getEventBus();
  if (bus) {
    for (const step of result.steps) {
      for (const tc of step.toolCalls) {
        if (!BUILT_IN_TOOLS.has(tc.toolName)) {
          bus.emit(BUS_EVENTS.TOOL_CALL, { agent: config.agentName, tool: tc.toolName, args: (tc as any).input });
        }
      }
      for (const tr of step.toolResults) {
        if (!BUILT_IN_TOOLS.has(tr.toolName)) {
          bus.emit(BUS_EVENTS.TOOL_RESULT, { agent: config.agentName, tool: tr.toolName, result: (tr as any).output });
        }
      }
    }
  }

  const items: ClarifyItem[] = [];
  for (const step of result.steps) {
    for (const tc of step.toolCalls) {
      if (tc.toolName === TOOL_NAMES.CLARIFY) {
        const input = (tc as any).input ?? {};
        if (input.items?.length) {
          items.push(...input.items);
        } else if (input.questions?.length) {
          for (const q of input.questions) {
            items.push({
              type: "question",
              text: q.question ?? q.text ?? String(q),
              ...(q.context && { context: q.context }),
            });
          }
        }
      }
    }
  }

  return {
    response: result.text,
    ...(items.length > 0 && { items }),
    toolsUsed: [...new Set(toolsUsed)],
    usage: extractUsage(result, startTime),
  };
}
