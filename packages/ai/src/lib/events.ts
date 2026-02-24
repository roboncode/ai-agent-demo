/** SSE event names sent to clients over Server-Sent Events */
export const SSE_EVENTS = {
  SESSION_START: "session:start",
  TEXT_DELTA: "text-delta",
  TOOL_CALL: "tool-call",
  TOOL_RESULT: "tool-result",
  DONE: "done",
  CANCELLED: "cancelled",
  AGENT_START: "agent:start",
  AGENT_END: "agent:end",
  AGENT_THINK: "agent:think",
  AGENT_PLAN: "agent:plan",
  ASK_USER: "ask:user",
  DELEGATE_START: "delegate:start",
  DELEGATE_END: "delegate:end",
  SKILL_INJECT: "skill:inject",
  ERROR: "error",
} as const;

export type SseEventName = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];

/** Internal bus event names emitted between agents via AgentEventBus */
export const BUS_EVENTS = {
  TEXT_DELTA: "text:delta",
  TOOL_CALL: "tool:call",
  TOOL_RESULT: "tool:result",
  DELEGATE_START: "delegate:start",
  DELEGATE_END: "delegate:end",
  SKILL_INJECT: "skill:inject",
} as const;

export type BusEventName = (typeof BUS_EVENTS)[keyof typeof BUS_EVENTS];

/** Maps internal bus event names to their corresponding SSE event names */
export const BUS_TO_SSE_MAP: Record<string, string> = {
  [BUS_EVENTS.DELEGATE_START]: SSE_EVENTS.DELEGATE_START,
  [BUS_EVENTS.DELEGATE_END]: SSE_EVENTS.DELEGATE_END,
  [BUS_EVENTS.TOOL_CALL]: SSE_EVENTS.TOOL_CALL,
  [BUS_EVENTS.TOOL_RESULT]: SSE_EVENTS.TOOL_RESULT,
  [BUS_EVENTS.SKILL_INJECT]: SSE_EVENTS.SKILL_INJECT,
};

/** Set of bus event names that are forwarded to SSE clients */
export const FORWARDED_BUS_EVENTS = new Set(Object.keys(BUS_TO_SSE_MAP));
