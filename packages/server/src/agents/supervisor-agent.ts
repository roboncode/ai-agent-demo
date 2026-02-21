import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getModel, extractUsage } from "../lib/ai-provider.js";
import { executeTask } from "./execute-task.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { generateConversationId } from "../registry/handler-factories.js";
import { streamAgentResponse } from "../lib/stream-helpers.js";

const SYSTEM_PROMPT = `You are a supervisor agent that routes user queries to the appropriate specialist agent.

When you receive a query:
1. Analyze what the user is asking about
2. Route to the appropriate agent using the routeToAgent tool
3. If the query spans multiple domains, make multiple tool calls
4. Synthesize the results into a coherent response

Always use the routeToAgent tool - never answer domain questions directly.`;

// Agents that should not be routed to (would cause circular calls or don't support task execution)
const EXCLUDED_AGENTS = new Set(["supervisor", "task"]);

function getRoutableAgents() {
  return agentRegistry.list().filter((a) => !EXCLUDED_AGENTS.has(a.name) && a.tools);
}

function buildRoutingTool() {
  const agents = getRoutableAgents();
  const agentNames = agents.map((a) => a.name) as [string, ...string[]];

  return tool({
    description:
      "Route a query to a specialist agent. Choose the agent that best matches the query topic.",
    inputSchema: z.object({
      agent: z.enum(agentNames).describe("The specialist agent to route to"),
      query: z.string().describe("The query to send to the agent"),
    }),
    execute: async ({ agent, query }) => {
      const result = await executeTask(agent, query);
      return result.result;
    },
  });
}

function buildSystemPrompt(basePrompt: string) {
  const agents = getRoutableAgents();
  const agentList = agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");
  return `${basePrompt}\n\nAvailable agents:\n${agentList}`;
}

export const SUPERVISOR_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools: {} as Record<string, any>,
};

export async function runSupervisorAgent(message: string, model?: string) {
  const startTime = performance.now();
  const routeToAgentTool = buildRoutingTool();
  const system = buildSystemPrompt(SYSTEM_PROMPT);

  const result = await generateText({
    model: getModel(model),
    system,
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

function buildHandler(format: "sse" | "json") {
  if (format === "sse") {
    return async (c: any, { systemPrompt, memoryContext }: any) => {
      const { message, conversationId: cid, model } = await c.req.json();
      const routeToAgentTool = buildRoutingTool();
      let system = buildSystemPrompt(systemPrompt);
      if (memoryContext) system += `\n\n## Memory Context\n${memoryContext}`;

      return streamAgentResponse(c, {
        system,
        tools: { routeToAgent: routeToAgentTool },
        prompt: message,
        model,
        conversationId: generateConversationId(cid),
      });
    };
  }

  return async (c: any, { systemPrompt, memoryContext }: any) => {
    const { message, conversationId: cid, model } = await c.req.json();
    const routeToAgentTool = buildRoutingTool();
    let system = buildSystemPrompt(systemPrompt);
    if (memoryContext) system += `\n\n## Memory Context\n${memoryContext}`;

    const { runAgent: runAgentFn } = await import("../lib/run-agent.js");
    const result = await runAgentFn(
      { system, tools: { routeToAgent: routeToAgentTool } },
      message,
      model,
    );
    return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
  };
}

// Self-registration
agentRegistry.register({
  name: "supervisor",
  description: "Supervisor routing agent that delegates to specialist agents",
  toolNames: ["routeToAgent"],
  defaultFormat: "sse",
  defaultSystem: SYSTEM_PROMPT,
  sseHandler: buildHandler("sse"),
  jsonHandler: buildHandler("json"),
});
