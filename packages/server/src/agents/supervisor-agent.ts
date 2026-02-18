import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getModel, extractUsage } from "../lib/ai-provider.js";
import { runWeatherAgent } from "./weather-agent.js";
import { runHackernewsAgent } from "./hackernews-agent.js";
import { runKnowledgeAgent } from "./knowledge-agent.js";

const SYSTEM_PROMPT = `You are a supervisor agent that routes user queries to the appropriate specialist agent.

Available agents:
- weather: Handles weather queries (current conditions, forecasts, temperature)
- hackernews: Handles Hacker News queries (trending stories, tech news)
- knowledge: Handles movie queries (search, recommendations, details)

When you receive a query:
1. Analyze what the user is asking about
2. Route to the appropriate agent using the routeToAgent tool
3. If the query spans multiple domains, make multiple tool calls
4. Synthesize the results into a coherent response

Always use the routeToAgent tool - never answer domain questions directly.`;

const routeToAgentTool = tool({
  description:
    "Route a query to a specialist agent. Choose the agent that best matches the query topic.",
  inputSchema: z.object({
    agent: z
      .enum(["weather", "hackernews", "knowledge"])
      .describe("The specialist agent to route to"),
    query: z.string().describe("The query to send to the agent"),
  }),
  execute: async ({ agent, query }) => {
    switch (agent) {
      case "weather":
        return await runWeatherAgent(query);
      case "hackernews":
        return await runHackernewsAgent(query);
      case "knowledge":
        return await runKnowledgeAgent(query);
    }
  },
});

export const SUPERVISOR_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools: { routeToAgent: routeToAgentTool },
};

export async function runSupervisorAgent(message: string, model?: string) {
  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: { routeToAgent: routeToAgentTool },
    stopWhen: stepCountIs(5),
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName);

  const agentsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => (tc as any).input)
    .filter((input): input is { agent: string; query: string } => !!input?.agent)
    .map((args) => args.agent);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
    agentsUsed: [...new Set(agentsUsed)],
    usage: extractUsage(result, startTime),
  };
}
