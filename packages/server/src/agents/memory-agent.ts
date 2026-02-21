import { tool } from "ai";
import { z } from "zod";
import { runAgent } from "../lib/run-agent.js";
import {
  saveMemory,
  recallMemory,
  listMemories,
} from "../storage/memory-store.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { makeRegistryStreamHandler } from "../registry/handler-factories.js";

const SYSTEM_PROMPT = `You are a memory-enabled agent. You can remember information across conversations by saving and recalling memories.

When the user tells you to remember something:
1. Use the saveMemory tool to store the information with a descriptive key
2. Confirm what you've saved

When the user asks about something they previously told you:
1. Use the recallMemory tool to look up specific information
2. Use the listMemories tool to see all stored memories if needed
3. Respond based on what you find

Be proactive about saving relevant preferences, facts, and context the user shares.`;

const saveMemoryTool = tool({
  description: "Save a piece of information to persistent memory",
  inputSchema: z.object({
    key: z
      .string()
      .describe("A descriptive key for this memory (e.g. 'user_name', 'preferred_language')"),
    value: z.string().describe("The information to remember"),
  }),
  execute: async ({ key, value }) => {
    const entry = await saveMemory(key, value);
    return { saved: true, key: entry.key, value: entry.value };
  },
});

const recallMemoryTool = tool({
  description: "Recall a specific piece of information from memory by key",
  inputSchema: z.object({
    key: z.string().describe("The key of the memory to recall"),
  }),
  execute: async ({ key }) => {
    const entry = await recallMemory(key);
    if (!entry) return { found: false, key };
    return { found: true, key: entry.key, value: entry.value };
  },
});

const listMemoriesTool = tool({
  description: "List all stored memories",
  inputSchema: z.object({}),
  execute: async () => {
    const memories = await listMemories();
    return {
      count: memories.length,
      memories: memories.map((m) => ({ key: m.key, value: m.value })),
    };
  },
});

export const MEMORY_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools: {
    saveMemory: saveMemoryTool,
    recallMemory: recallMemoryTool,
    listMemories: listMemoriesTool,
  },
};

export const runMemoryAgent = (message: string, model?: string) =>
  runAgent(MEMORY_AGENT_CONFIG, message, model);

// Self-registration
agentRegistry.register({
  name: "memory",
  description: "Memory-enabled agent that saves and recalls information across conversations",
  toolNames: ["saveMemory", "recallMemory", "listMemories"],
  type: "stream",
  defaultSystem: SYSTEM_PROMPT,
  handler: makeRegistryStreamHandler({
    tools: { saveMemory: saveMemoryTool, recallMemory: recallMemoryTool, listMemories: listMemoriesTool },
  }),
});
