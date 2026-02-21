import type { UsageInfo } from "../lib/ai-provider.js";
import { runAgent } from "../lib/run-agent.js";
import { agentRegistry } from "../registry/agent-registry.js";

export interface TaskResult {
  agent: string;
  query: string;
  result: { response: string; toolsUsed: string[]; usage?: UsageInfo };
}

export async function executeTask(
  agent: string,
  query: string,
): Promise<TaskResult> {
  const registration = agentRegistry.get(agent);
  if (!registration) {
    return { agent, query, result: { response: `Unknown agent: ${agent}`, toolsUsed: [] } };
  }

  if (!registration.tools) {
    return { agent, query, result: { response: `Agent "${agent}" does not support task execution`, toolsUsed: [] } };
  }

  const systemPrompt = agentRegistry.getResolvedPrompt(agent)!;
  const result = await runAgent({ system: systemPrompt, tools: registration.tools }, query);
  return { agent, query, result };
}
