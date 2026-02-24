import { tool } from "ai";
import { z } from "zod";
import type { MemoryStore } from "../storage/interfaces.js";
import { createInMemoryMemoryStore } from "../storage/in-memory/memory-store.js";

let defaultStore: MemoryStore | null = null;

/** Returns the singleton default MemoryStore, lazy-creating an in-memory store on first call. */
export function getDefaultMemoryStore(): MemoryStore {
  if (!defaultStore) {
    defaultStore = createInMemoryMemoryStore();
  }
  return defaultStore;
}

/** Replaces the default MemoryStore (called by plugin.ts when config.memoryStore is provided). */
export function setDefaultMemoryStore(store: MemoryStore): void {
  defaultStore = store;
}

const memoryInputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get"),
    key: z.string().describe("The key to retrieve"),
    namespace: z.string().optional().describe("Override the default namespace"),
  }),
  z.object({
    action: z.literal("set"),
    key: z.string().describe("The key to store under"),
    value: z.string().describe("The value to store"),
    context: z.string().optional().describe("Optional context about why this was stored"),
    namespace: z.string().optional().describe("Override the default namespace"),
  }),
  z.object({
    action: z.literal("list"),
    namespace: z.string().optional().describe("Override the default namespace"),
  }),
  z.object({
    action: z.literal("delete"),
    key: z.string().describe("The key to delete"),
    namespace: z.string().optional().describe("Override the default namespace"),
  }),
]);

/**
 * Creates the built-in `_memory` tool bound to a specific store and default namespace.
 * The namespace defaults to the agent name but can be overridden per-call.
 */
export function createMemoryTool(store: MemoryStore, defaultNamespace: string) {
  return tool({
    description:
      "Store and retrieve information across conversations. " +
      "Actions: set (save key-value), get (retrieve by key), list (show all entries), delete (remove by key). " +
      "Use to remember user preferences, intermediate results, or important facts.",
    inputSchema: memoryInputSchema,
    execute: async (input) => {
      const ns = input.namespace ?? defaultNamespace;

      switch (input.action) {
        case "get": {
          const entry = await store.getEntry(ns, input.key);
          if (!entry) return { found: false, key: input.key, namespace: ns };
          return { found: true, key: entry.key, value: entry.value, context: entry.context, namespace: ns };
        }
        case "set": {
          const entry = await store.saveEntry(ns, input.key, input.value, input.context);
          return { saved: true, key: entry.key, namespace: ns };
        }
        case "list": {
          const entries = await store.listEntries(ns);
          return {
            namespace: ns,
            count: entries.length,
            entries: entries.map((e) => ({ key: e.key, value: e.value, context: e.context })),
          };
        }
        case "delete": {
          const deleted = await store.deleteEntry(ns, input.key);
          return { deleted, key: input.key, namespace: ns };
        }
      }
    },
  });
}
