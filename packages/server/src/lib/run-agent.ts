import { generateText, stepCountIs } from "ai";
import { getModel, extractUsage } from "./ai-provider.js";
import { getEventBus } from "./delegation-context.js";
import type { ClarifyItem } from "../agents/execute-task.js";

interface AgentConfig {
  system: string;
  tools: Record<string, any>;
}

export async function runAgent(
  config: AgentConfig,
  message: string,
  model?: string,
  maxSteps = 5,
) {
  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: config.system,
    prompt: message,
    tools: config.tools,
    stopWhen: stepCountIs(maxSteps),
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName)
    .filter((t) => t !== "_clarify");

  // Emit tool events post-hoc to the event bus (skip internal _clarify)
  const bus = getEventBus();
  if (bus) {
    for (const step of result.steps) {
      for (const tc of step.toolCalls) {
        if (tc.toolName !== "_clarify") {
          bus.emit("tool:call", { tool: tc.toolName, args: (tc as any).input });
        }
      }
      for (const tr of step.toolResults) {
        if (tr.toolName !== "_clarify") {
          bus.emit("tool:result", { tool: tr.toolName, result: (tr as any).output });
        }
      }
    }
  }

  // Detect _clarify calls (injected by executeTask for interactive mode)
  // Models sometimes ignore the schema and send {questions:[{question,context}]}
  // instead of {items:[{type,text,context}]} — normalize both formats.
  const items: ClarifyItem[] = [];
  for (const step of result.steps) {
    for (const tc of step.toolCalls) {
      if (tc.toolName === "_clarify") {
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
