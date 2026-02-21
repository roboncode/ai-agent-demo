import { tool } from "ai";
import { z } from "zod";
import type { UsageInfo } from "../lib/ai-provider.js";
import { runAgent } from "../lib/run-agent.js";
import { agentRegistry } from "../registry/agent-registry.js";
import {
  getOrchestratorAgents,
  MAX_DELEGATION_DEPTH,
  delegationStore,
  getEventBus,
  type DelegationContext,
} from "../lib/delegation-context.js";

const clarifyItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("question"), text: z.string(), context: z.string().optional() }),
  z.object({ type: z.literal("option"), text: z.string(), choices: z.array(z.string()), context: z.string().optional() }),
  z.object({ type: z.literal("confirmation"), text: z.string(), context: z.string().optional() }),
  z.object({ type: z.literal("action"), text: z.string(), context: z.string().optional() }),
  z.object({ type: z.literal("warning"), text: z.string(), context: z.string().optional() }),
  z.object({ type: z.literal("info"), text: z.string() }),
]);

export type ClarifyItem = z.infer<typeof clarifyItemSchema>;

const CLARIFY_TOOL = tool({
  description:
    "Use when you need information, confirmation, or approval from the user. " +
    "Supports: question (free text), option (pick from choices), " +
    "confirmation (yes/no), action (declare intent), warning (risk), info (status update). " +
    "Only use when you genuinely cannot proceed without user interaction.",
  inputSchema: z.object({ items: z.array(clarifyItemSchema) }),
  // No execute — deferred, detected post-hoc by runAgent
});

const CLARIFY_PROMPT_SUFFIX =
  "\n\nIMPORTANT: If the user's query is vague or lacks specifics needed to give a good answer, " +
  "you MUST use the _clarify tool to ask for more information. Do NOT guess, do NOT ask in plain text, " +
  "and do NOT proceed without the needed details. Call _clarify with items like: " +
  '{items: [{type: "question", text: "Your question here", context: "Why you need this"}]}.';

export interface TaskResult {
  agent: string;
  query: string;
  result: {
    response: string;
    items?: ClarifyItem[];
    toolsUsed: string[];
    usage?: UsageInfo;
  };
}

function errorResult(agent: string, query: string, message: string): TaskResult {
  return { agent, query, result: { response: message, toolsUsed: [] } };
}

export async function executeTask(
  agent: string,
  query: string,
): Promise<TaskResult> {
  // Guard 1: Unknown agent
  const registration = agentRegistry.get(agent);
  if (!registration) {
    return errorResult(agent, query, `Unknown agent: ${agent}`);
  }

  // Guard 2: Orchestrator agents must not be delegated to
  if (getOrchestratorAgents().has(agent)) {
    return errorResult(agent, query, `Agent "${agent}" is an orchestrator and cannot be delegated to`);
  }

  // Guard 3: Empty tools — catches agents with tools: {}
  if (!registration.tools || Object.keys(registration.tools).length === 0) {
    return errorResult(agent, query, `Agent "${agent}" does not support task execution`);
  }

  // Guard 4: Depth & circular routing
  const parentCtx = delegationStore.getStore();
  const chain = parentCtx?.chain ?? [];
  const depth = parentCtx?.depth ?? 0;

  if (depth >= MAX_DELEGATION_DEPTH) {
    return errorResult(agent, query, `Delegation depth limit (${MAX_DELEGATION_DEPTH}) exceeded. Chain: ${chain.join(" → ")} → ${agent}`);
  }

  if (chain.length > 0 && chain[chain.length - 1] === agent) {
    return errorResult(agent, query, `Self-delegation blocked: "${agent}" cannot delegate to itself`);
  }

  if (chain.includes(agent)) {
    return errorResult(agent, query, `Circular delegation blocked: ${chain.join(" → ")} → ${agent}`);
  }

  // Emit delegate:start event
  const bus = getEventBus();
  const from = chain.length > 0 ? chain[chain.length - 1] : "supervisor";
  bus?.emit("delegate:start", { from, to: agent, query });

  // Execute with updated delegation context — propagate parent's event bus
  const childCtx: DelegationContext = {
    chain: [...chain, agent],
    depth: depth + 1,
    events: parentCtx?.events,
  };

  const systemPrompt = agentRegistry.getResolvedPrompt(agent)!;
  const augmentedTools = { ...registration.tools!, _clarify: CLARIFY_TOOL };
  const augmentedSystem = systemPrompt + CLARIFY_PROMPT_SUFFIX;

  const result = await delegationStore.run(childCtx, () =>
    runAgent({ system: augmentedSystem, tools: augmentedTools }, query)
  );

  // Emit delegate:end event
  bus?.emit("delegate:end", {
    from,
    to: agent,
    summary: result.response.slice(0, 200),
  });

  return { agent, query, result };
}
