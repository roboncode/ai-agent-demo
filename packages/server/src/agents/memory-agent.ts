import { generateText, tool } from "ai";
import { z } from "zod";
import { getModel } from "../lib/ai-provider.js";
import {
  saveMemory,
  recallMemory,
  listMemories,
} from "../storage/memory-store.js";

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

export async function runMemoryAgent(message: string, model?: string) {
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: {
      saveMemory: saveMemoryTool,
      recallMemory: recallMemoryTool,
      listMemories: listMemoriesTool,
    },
    maxSteps: 5,
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
