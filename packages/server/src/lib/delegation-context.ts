import { AsyncLocalStorage } from "node:async_hooks";

export interface DelegationContext {
  /** Ordered list of agent names in the current call chain */
  chain: string[];
  /** Current nesting depth (0 = top-level call) */
  depth: number;
}

/** Maximum allowed delegation depth before blocking */
export const MAX_DELEGATION_DEPTH = 3;

/** Agents that orchestrate other agents and must never be delegated to */
export const ORCHESTRATOR_AGENTS = new Set(["supervisor", "task"]);

/** AsyncLocalStorage instance that propagates delegation context through async boundaries */
export const delegationStore = new AsyncLocalStorage<DelegationContext>();
