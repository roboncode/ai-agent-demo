import { runAgent } from "../lib/run-agent.js";
import {
  runScriptTool,
  readScriptTool,
  listScriptsTool,
} from "../tools/scripts.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { makeRegistryHandlers } from "../registry/handler-factories.js";

const SYSTEM_PROMPT = `You are a script execution agent. You execute stored scripts and return the results.

RULES:
- ALWAYS call runScript to execute. NEVER compute results yourself.
- Call readScript FIRST if you need to check what args the script expects, THEN call runScript once.
- Do NOT call runScript without knowing the correct args — read first, run once.

Workflow:
1. If the user names a specific script and provides args, call runScript directly
2. If you're unsure about arg names, call readScript first to check, then runScript
3. If the user is vague about which script, call listScripts to find it

Response format — be brief and data-focused:
- State the script name that was executed
- Show the returned value directly (the actual data from returnValue)
- Include any console output if present
- Do NOT re-explain the math or logic — just show the execution result`;

const tools = {
  runScript: runScriptTool,
  readScript: readScriptTool,
  listScripts: listScriptsTool,
};

export const EXECUTE_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools,
};

export const runExecuteAgent = (message: string, model?: string) =>
  runAgent(EXECUTE_AGENT_CONFIG, message, model);

// Self-registration
agentRegistry.register({
  name: "execute",
  description: "Script execution agent — runs stored JavaScript scripts in a sandbox",
  toolNames: ["runScript", "readScript", "listScripts"],
  defaultFormat: "sse",
  defaultSystem: SYSTEM_PROMPT,
  tools,
  ...makeRegistryHandlers({ tools }),
});
