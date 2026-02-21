import type { UsageInfo } from "../lib/ai-provider.js";
import { agentRegistry } from "../registry/agent-registry.js";

export interface TaskResult {
  agent: string;
  query: string;
  result: { response: string; toolsUsed: string[]; usage?: UsageInfo };
}

// Map of agent names to their runAgent functions (lazy-loaded)
const runFunctions = new Map<string, (message: string, model?: string) => Promise<any>>();

async function getRunFunction(agentName: string) {
  if (runFunctions.has(agentName)) return runFunctions.get(agentName)!;

  // Dynamic import based on agent name
  const moduleMap: Record<string, { path: string; fn: string }> = {
    weather: { path: "./weather-agent.js", fn: "runWeatherAgent" },
    hackernews: { path: "./hackernews-agent.js", fn: "runHackernewsAgent" },
    knowledge: { path: "./knowledge-agent.js", fn: "runKnowledgeAgent" },
    coding: { path: "./coding-agent.js", fn: "runCodingAgent" },
    compact: { path: "./compact-agent.js", fn: "runCompactAgent" },
    memory: { path: "./memory-agent.js", fn: "runMemoryAgent" },
  };

  const entry = moduleMap[agentName];
  if (!entry) return null;

  const mod = await import(entry.path);
  const fn = mod[entry.fn];
  runFunctions.set(agentName, fn);
  return fn;
}

export async function executeTask(
  agent: string,
  query: string,
): Promise<TaskResult> {
  // Check registry first
  const registered = agentRegistry.get(agent);
  if (!registered) {
    return { agent, query, result: { response: `Unknown agent: ${agent}`, toolsUsed: [] } };
  }

  // Try to use the run function for JSON-style execution
  const runFn = await getRunFunction(agent);
  if (runFn) {
    const result = await runFn(query);
    return { agent, query, result };
  }

  return { agent, query, result: { response: `Agent "${agent}" does not support task execution`, toolsUsed: [] } };
}
