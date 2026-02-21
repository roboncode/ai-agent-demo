import type { UsageInfo } from "../lib/ai-provider.js";
import { runAgent } from "../lib/run-agent.js";
import { agentRegistry } from "../registry/agent-registry.js";
import {
  ORCHESTRATOR_AGENTS,
  MAX_DELEGATION_DEPTH,
  delegationStore,
  type DelegationContext,
} from "../lib/delegation-context.js";

export interface TaskResult {
  agent: string;
  query: string;
  result: { response: string; toolsUsed: string[]; usage?: UsageInfo };
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
  if (ORCHESTRATOR_AGENTS.has(agent)) {
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

  // Execute with updated delegation context
  const childCtx: DelegationContext = {
    chain: [...chain, agent],
    depth: depth + 1,
  };

  const systemPrompt = agentRegistry.getResolvedPrompt(agent)!;
  const result = await delegationStore.run(childCtx, () =>
    runAgent({ system: systemPrompt, tools: registration.tools! }, query)
  );

  return { agent, query, result };
}
