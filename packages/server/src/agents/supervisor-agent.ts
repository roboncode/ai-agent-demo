import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getModel, extractUsage } from "../lib/ai-provider.js";
import { executeTask } from "./execute-task.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { generateConversationId } from "../registry/handler-factories.js";
import { streamAgentResponse } from "../lib/stream-helpers.js";
import { getOrchestratorAgents } from "../lib/delegation-context.js";

const DEFAULT_SYSTEM_PROMPT = `You are a supervisor agent that routes user queries to the appropriate specialist agent.

When you receive a query:
1. Analyze what the user is asking about
2. Route to the appropriate agent using the routeToAgent tool
3. If the query spans multiple domains, make multiple tool calls
4. Synthesize the results into a coherent response

Always use the routeToAgent tool - never answer domain questions directly.`;

export interface SupervisorAgentConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  /** Explicit list of agent names to route to (omit for auto-discovery) */
  agents?: string[];
}

function getRoutableAgents(allowedAgents?: string[]) {
  const orchestrators = getOrchestratorAgents();
  return agentRegistry.list().filter((a) => {
    if (orchestrators.has(a.name)) return false;
    if (!a.tools || Object.keys(a.tools).length === 0) return false;
    if (allowedAgents) return allowedAgents.includes(a.name);
    return true;
  });
}

function buildRoutingTool(allowedAgents?: string[]) {
  const agents = getRoutableAgents(allowedAgents);
  if (agents.length === 0) {
    throw new Error("No routable agents available");
  }
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

function buildSystemPrompt(basePrompt: string, allowedAgents?: string[]) {
  const agents = getRoutableAgents(allowedAgents);
  const agentList = agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");
  return `${basePrompt}\n\nAvailable agents:\n${agentList}`;
}

export async function runSupervisorAgent(message: string, model?: string, allowedAgents?: string[]) {
  const startTime = performance.now();
  const routeToAgentTool = buildRoutingTool(allowedAgents);
  const system = buildSystemPrompt(DEFAULT_SYSTEM_PROMPT, allowedAgents);

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

function buildHandler(format: "sse" | "json", allowedAgents?: string[]) {
  if (format === "sse") {
    return async (c: any, { systemPrompt, memoryContext }: any) => {
      const { message, conversationId: cid, model } = await c.req.json();
      const routeToAgentTool = buildRoutingTool(allowedAgents);
      let system = buildSystemPrompt(systemPrompt, allowedAgents);
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
    const routeToAgentTool = buildRoutingTool(allowedAgents);
    let system = buildSystemPrompt(systemPrompt, allowedAgents);
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

export function createSupervisorAgent(config: SupervisorAgentConfig) {
  const {
    name,
    description = "Supervisor routing agent that delegates to specialist agents",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    agents,
  } = config;

  agentRegistry.register({
    name,
    description,
    toolNames: ["routeToAgent"],
    defaultFormat: "sse",
    defaultSystem: systemPrompt,
    isOrchestrator: true,
    agents,
    sseHandler: buildHandler("sse", agents),
    jsonHandler: buildHandler("json", agents),
  });
}

// Default self-registration (backward compatible)
createSupervisorAgent({ name: "supervisor" });
