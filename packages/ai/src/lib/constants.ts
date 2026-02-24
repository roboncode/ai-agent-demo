/** Well-known tool names used by the framework */
export const TOOL_NAMES = {
  ROUTE_TO_AGENT: "routeToAgent",
  CREATE_TASK: "createTask",
  CLARIFY: "_clarify",
  MEMORY: "_memory",
} as const;

/** Default configuration values */
export const DEFAULTS = {
  MAX_DELEGATION_DEPTH: 3,
  MAX_STEPS: 5,
  SYNTHESIS_MESSAGE: "Synthesizing results...",
  RESPONSE_SKILLS_KEY: "_responseSkills",
  COMPACTION_THRESHOLD: 20,
  COMPACTION_PRESERVE_RECENT: 4,
} as const;
