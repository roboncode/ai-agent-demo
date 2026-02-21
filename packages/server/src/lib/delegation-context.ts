import { AsyncLocalStorage } from "node:async_hooks";
import { agentRegistry } from "../registry/agent-registry.js";
import type { AgentEventBus } from "./agent-events.js";

export interface DelegationContext {
  /** Ordered list of agent names in the current call chain */
  chain: string[];
  /** Current nesting depth (0 = top-level call) */
  depth: number;
  /** Shared event bus for the entire call tree */
  events?: AgentEventBus;
}

/** Maximum allowed delegation depth before blocking */
export const MAX_DELEGATION_DEPTH = 3;

/** Returns the set of orchestrator agent names (derived from registry at call time) */
export function getOrchestratorAgents(): Set<string> {
  return agentRegistry.getOrchestratorNames();
}

/** AsyncLocalStorage instance that propagates delegation context through async boundaries */
export const delegationStore = new AsyncLocalStorage<DelegationContext>();

/** Returns the event bus from the current delegation context, if any */
export function getEventBus(): AgentEventBus | undefined {
  return delegationStore.getStore()?.events;
}
