import { runAgent } from "../lib/run-agent.js";
import {
  createScriptTool,
  updateScriptTool,
  readScriptTool,
  listScriptsTool,
  deleteScriptTool,
} from "../tools/scripts.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { makeRegistryHandlers } from "../registry/handler-factories.js";

const SYSTEM_PROMPT = `You are a coding agent that creates, edits, and manages persistent JavaScript scripts.

Scripts are stored as files and can be executed later via the execute agent or the REST API.

When asked to create or modify code:
1. Use listScripts to see what already exists
2. Use readScript before editing to see current code
3. Use createScript for new scripts, updateScript for modifications
4. Always write a main(args) function as the entry point

Script conventions:
- Every script MUST have an \`export default function main(args)\` entry point
- \`args\` is always an object — destructure what you need
- Return a value from main() — it becomes the execution result
- Use console.log() for intermediate output
- Write pure JavaScript (no imports/requires, no file system, no network)
- Keep scripts focused, well-commented, and reusable
- Use helper functions above main() for complex logic

Example script structure:
\`\`\`js
// Helper functions
function calculate(x, y) {
  return x + y;
}

// Entry point
export default function main(args) {
  const { x, y } = args;
  return { result: calculate(x, y) };
}
\`\`\``;

const tools = {
  createScript: createScriptTool,
  updateScript: updateScriptTool,
  readScript: readScriptTool,
  listScripts: listScriptsTool,
  deleteScript: deleteScriptTool,
};

export const CODING_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools,
};

export const runCodingAgent = (message: string, model?: string) =>
  runAgent(CODING_AGENT_CONFIG, message, model);

// Self-registration
agentRegistry.register({
  name: "coding",
  description: "Script creation and management agent — writes persistent JavaScript scripts",
  toolNames: ["createScript", "updateScript", "readScript", "listScripts", "deleteScript"],
  defaultFormat: "sse",
  defaultSystem: SYSTEM_PROMPT,
  tools,
  ...makeRegistryHandlers({ tools }),
});
