import type { UsageInfo } from "../lib/ai-provider.js";
import { runWeatherAgent } from "./weather-agent.js";
import { runHackernewsAgent } from "./hackernews-agent.js";
import { runKnowledgeAgent } from "./knowledge-agent.js";

export interface TaskResult {
  agent: string;
  query: string;
  result: { response: string; toolsUsed: string[]; usage?: UsageInfo };
}

export async function executeTask(
  agent: string,
  query: string,
): Promise<TaskResult> {
  let result: { response: string; toolsUsed: string[]; usage?: UsageInfo };

  switch (agent) {
    case "weather":
      result = await runWeatherAgent(query);
      break;
    case "hackernews":
      result = await runHackernewsAgent(query);
      break;
    case "knowledge":
      result = await runKnowledgeAgent(query);
      break;
    default:
      result = { response: `Unknown agent: ${agent}`, toolsUsed: [] };
  }

  return { agent, query, result };
}
