import { generateText, stepCountIs } from "ai";
import { getModel, extractUsage } from "./ai-provider.js";

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
    .map((tc) => tc.toolName);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
    usage: extractUsage(result, startTime),
  };
}
