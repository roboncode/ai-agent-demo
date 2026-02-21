import { agentRegistry } from "./agent-registry.js";
import { loadOverrides } from "../storage/prompt-store.js";
import { initializeVoice } from "../voice/voice-manager.js";

export async function initializeRegistry() {
  // Import all tool modules (triggers self-registration)
  await Promise.all([
    import("../tools/weather.js"),
    import("../tools/hackernews.js"),
    import("../tools/movies.js"),
  ]);

  // Import all agent modules (triggers self-registration)
  await Promise.all([
    import("../agents/weather-agent.js"),
    import("../agents/hackernews-agent.js"),
    import("../agents/knowledge-agent.js"),
    import("../agents/supervisor-agent.js"),
    import("../agents/memory-agent.js"),
    import("../agents/coding-agent.js"),
    import("../agents/compact-agent.js"),
    import("../agents/human-in-loop-agent.js"),
    import("../agents/recipe-agent.js"),
    import("../agents/guardrails-agent.js"),
  ]);

  // Load persisted prompt overrides
  const overrides = await loadOverrides();
  const overrideMap: Record<string, string> = {};
  for (const [name, entry] of Object.entries(overrides)) {
    overrideMap[name] = entry.prompt;
  }
  agentRegistry.loadPromptOverrides(overrideMap);

  // Initialize voice subsystem
  initializeVoice();

  console.log(
    `Registry initialized: ${agentRegistry.list().length} agents, tools loaded`,
  );
}
