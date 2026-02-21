import { tool } from "ai";
import { z } from "zod";
import vm from "node:vm";
import { toolRegistry } from "../registry/tool-registry.js";
import {
  saveScript,
  getScript,
  updateScript,
  deleteScript,
  listScripts,
} from "../storage/script-store.js";

// ── createScript ──

export const createScriptTool = tool({
  description:
    "Create a new JavaScript script file. The script must have a main(args) function as its entry point.",
  inputSchema: z.object({
    name: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .describe("Script name (lowercase, hyphens allowed, e.g. 'compound-interest')"),
    code: z.string().describe("JavaScript source code with a main(args) entry point"),
    description: z.string().optional().describe("Brief description of what the script does"),
  }),
  execute: async ({ name, code, description }) => {
    const entry = await saveScript(name, code, description);
    return { success: true, message: `Script "${name}" created.`, entry };
  },
});

// ── updateScript ──

export const updateScriptTool = tool({
  description:
    "Update an existing script's code and/or description. Read the script first to see current code.",
  inputSchema: z.object({
    name: z.string().describe("Script name to update"),
    code: z.string().optional().describe("New JavaScript source code"),
    description: z.string().optional().describe("New description"),
  }),
  execute: async ({ name, code, description }) => {
    const entry = await updateScript(name, code, description);
    return { success: true, message: `Script "${name}" updated.`, entry };
  },
});

// ── readScript ──

export const readScriptTool = tool({
  description: "Read a script's source code and metadata.",
  inputSchema: z.object({
    name: z.string().describe("Script name to read"),
  }),
  execute: async ({ name }) => {
    const result = await getScript(name);
    if (!result) return { success: false, error: `Script "${name}" not found.` };
    return { success: true, ...result };
  },
});

// ── listScripts ──

export const listScriptsTool = tool({
  description: "List all available scripts with their names, descriptions, and last updated times.",
  inputSchema: z.object({}),
  execute: async () => {
    const entries = await listScripts();
    return {
      success: true,
      count: entries.length,
      scripts: entries.map(({ name, description, updatedAt }) => ({
        name,
        description,
        updatedAt,
      })),
    };
  },
});

// ── deleteScript ──

export const deleteScriptTool = tool({
  description: "Delete a script by name.",
  inputSchema: z.object({
    name: z.string().describe("Script name to delete"),
  }),
  execute: async ({ name }) => {
    const deleted = await deleteScript(name);
    if (!deleted) return { success: false, error: `Script "${name}" not found.` };
    return { success: true, message: `Script "${name}" deleted.` };
  },
});

// ── runScript ──

export const runScriptTool = tool({
  description:
    "Execute a stored script in a sandboxed environment. The script's main(args) function is called with the provided args.",
  inputSchema: z.object({
    name: z.string().describe("Script name to execute"),
    args: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Arguments object passed to main(args)"),
  }),
  execute: async ({ name, args }) => {
    return executeScript(name, args);
  },
});

export async function executeScript(
  name: string,
  args?: Record<string, unknown>,
) {
  const result = await getScript(name);
  if (!result) return { success: false, error: `Script "${name}" not found.` };

  const logs: string[] = [];
  const errors: string[] = [];

  const sandbox = {
    console: {
      log: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
      error: (...a: unknown[]) => errors.push(a.map(String).join(" ")),
      warn: (...a: unknown[]) => logs.push(`[warn] ${a.map(String).join(" ")}`),
    },
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    __args__: args ?? {},
  };

  // Strip ESM syntax for VM compatibility
  const wrapped =
    result.code.replace(
      /export\s+default\s+function\s+main/,
      "function main",
    ) + "\n\nmain(__args__)";

  try {
    const context = vm.createContext(sandbox);
    const returnValue = vm.runInNewContext(wrapped, context, {
      timeout: 5000,
      displayErrors: true,
    });

    return {
      success: true,
      returnValue:
        returnValue !== undefined ? JSON.parse(JSON.stringify(returnValue)) : undefined,
      output: logs.length > 0 ? logs.join("\n") : undefined,
      errors: errors.length > 0 ? errors.join("\n") : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      output: logs.length > 0 ? logs.join("\n") : undefined,
      errors: errors.length > 0 ? errors.join("\n") : undefined,
    };
  }
}

// ── Self-registration ──

toolRegistry.register({
  name: "createScript",
  description: "Create a new JavaScript script file",
  inputSchema: z.object({
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
  }),
  tool: createScriptTool,
  directExecute: async (input) => createScriptTool.execute!(input, { toolCallId: "direct" } as any),
  category: "scripts",
});

toolRegistry.register({
  name: "updateScript",
  description: "Update an existing script's code or description",
  inputSchema: z.object({
    name: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
  }),
  tool: updateScriptTool,
  directExecute: async (input) => updateScriptTool.execute!(input, { toolCallId: "direct" } as any),
  category: "scripts",
});

toolRegistry.register({
  name: "readScript",
  description: "Read a script's source code and metadata",
  inputSchema: z.object({ name: z.string() }),
  tool: readScriptTool,
  directExecute: async (input) => readScriptTool.execute!(input, { toolCallId: "direct" } as any),
  category: "scripts",
});

toolRegistry.register({
  name: "listScripts",
  description: "List all available scripts",
  inputSchema: z.object({}),
  tool: listScriptsTool,
  directExecute: async () => listScriptsTool.execute!({}, { toolCallId: "direct" } as any),
  category: "scripts",
});

toolRegistry.register({
  name: "deleteScript",
  description: "Delete a script by name",
  inputSchema: z.object({ name: z.string() }),
  tool: deleteScriptTool,
  directExecute: async (input) => deleteScriptTool.execute!(input, { toolCallId: "direct" } as any),
  category: "scripts",
});

toolRegistry.register({
  name: "runScript",
  description: "Execute a stored script in a sandbox",
  inputSchema: z.object({
    name: z.string(),
    args: z.record(z.string(), z.unknown()).optional(),
  }),
  tool: runScriptTool,
  directExecute: (input) => executeScript(input.name, input.args),
  category: "scripts",
});
