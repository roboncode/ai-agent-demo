import { generateText, tool } from "ai";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { getModel, extractUsage } from "../lib/ai-provider.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { generateConversationId } from "../registry/handler-factories.js";

interface PendingAction {
  id: string;
  action: string;
  description: string;
  parameters: Record<string, unknown>;
  status: "pending_approval" | "approved" | "rejected";
  result?: unknown;
  createdAt: number; // timestamp for TTL cleanup
}

// In-memory store for pending actions with TTL cleanup
const pendingActions = new Map<string, PendingAction>();
const ACTION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_PENDING_ACTIONS = 1000;

function cleanupExpiredActions() {
  const now = Date.now();
  for (const [id, action] of pendingActions) {
    if (now - action.createdAt > ACTION_TTL_MS) {
      pendingActions.delete(id);
    }
  }
}

const SYSTEM_PROMPT = `You are an agent that proposes actions for human approval before executing them.

You MUST ALWAYS use one of the available tools to propose an action. NEVER describe the action in text only.

Available tools:
- sendEmail: Propose sending an email
- deleteData: Propose deleting data
- publishContent: Propose publishing content

You MUST call the appropriate tool with all required parameters. The action will be queued for human review.`;

// Schema-only tools (no execute function) - AI proposes but doesn't auto-execute
const proposalTools = {
  sendEmail: tool({
    description: "Propose sending an email to a recipient",
    inputSchema: z.object({
      to: z.string().describe("Email recipient"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body content"),
    }),
  }),
  deleteData: tool({
    description: "Propose deleting data from the system",
    inputSchema: z.object({
      resource: z.string().describe("The resource to delete"),
      reason: z.string().describe("Reason for deletion"),
    }),
  }),
  publishContent: tool({
    description: "Propose publishing content",
    inputSchema: z.object({
      title: z.string().describe("Content title"),
      content: z.string().describe("Content body"),
      platform: z.string().describe("Target platform"),
    }),
  }),
};

function generateId() {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runHumanInLoopAgent(message: string, model?: string) {
  // Clean up expired actions before adding new ones
  cleanupExpiredActions();

  // Enforce max size to prevent unbounded growth
  if (pendingActions.size > MAX_PENDING_ACTIONS) {
    const oldest = [...pendingActions.entries()]
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toRemove = oldest.slice(0, pendingActions.size - MAX_PENDING_ACTIONS);
    for (const [id] of toRemove) {
      pendingActions.delete(id);
    }
  }

  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: proposalTools,
    toolChoice: "required",
  });

  // Intercept tool calls and store as pending actions
  const proposals: PendingAction[] = [];

  for (const step of result.steps) {
    for (const toolCall of step.toolCalls) {
      const id = generateId();
      const input = (toolCall as any).input as Record<string, unknown> | undefined;
      const action: PendingAction = {
        id,
        action: toolCall.toolName,
        description: `${toolCall.toolName} with params: ${JSON.stringify(input)}`,
        parameters: input ?? {},
        status: "pending_approval",
        createdAt: Date.now(),
      };
      pendingActions.set(id, action);
      proposals.push(action);
    }
  }

  const usage = extractUsage(result, startTime);

  if (proposals.length === 0) {
    return {
      response: result.text || "I couldn't determine an action to propose. Could you be more specific?",
      pendingActions: [],
      usage,
    };
  }

  return {
    response:
      result.text ||
      "I've proposed the following actions for your approval:",
    pendingActions: proposals.map((p) => ({
      id: p.id,
      action: p.action,
      description: p.description,
      parameters: p.parameters,
      status: p.status,
    })),
    usage,
  };
}

export async function approveAction(id: string, approved: boolean) {
  const action = pendingActions.get(id);
  if (!action) {
    return { error: "Action not found", id };
  }

  if (action.status !== "pending_approval") {
    return { error: `Action already ${action.status}`, id };
  }

  action.status = approved ? "approved" : "rejected";

  if (approved) {
    action.result = {
      executed: true,
      action: action.action,
      parameters: action.parameters,
      executedAt: new Date().toISOString(),
      message: `Action "${action.action}" executed successfully (simulated)`,
    };
  } else {
    action.result = {
      executed: false,
      rejectedAt: new Date().toISOString(),
      message: `Action "${action.action}" was rejected by user`,
    };
  }

  // Remove after resolution to prevent leak
  const result = {
    id: action.id,
    action: action.action,
    status: action.status,
    result: action.result,
  };
  pendingActions.delete(id);

  return result;
}

// Self-registration
agentRegistry.register({
  name: "human-in-loop",
  description: "Agent that proposes actions for human approval before executing",
  toolNames: ["sendEmail", "deleteData", "publishContent"],
  type: "json",
  defaultSystem: SYSTEM_PROMPT,
  handler: async (c: Context) => {
    const { message, model } = await c.req.json();
    const result = await runHumanInLoopAgent(message, model);
    return c.json(result, 200);
  },
  subRoutes: [
    {
      subPath: "/stream",
      method: "post",
      summary: "Human-in-the-loop agent (streaming)",
      description: "SSE variant: emits status, tool-call for each proposed action, proposal with IDs, then done",
      type: "stream",
      handler: async (c: Context) => {
        const { message, conversationId: cid, model } = await c.req.json();
        const convId = generateConversationId(cid);
        return streamSSE(c, async (stream) => {
          let id = 0;
          await stream.writeSSE({ id: String(id++), event: "status", data: JSON.stringify({ phase: "proposing action" }) });
          const result = await runHumanInLoopAgent(message, model);
          for (const action of result.pendingActions) {
            await stream.writeSSE({ id: String(id++), event: "tool-call", data: JSON.stringify({ toolName: action.action, args: action.parameters }) });
          }
          await stream.writeSSE({
            id: String(id++),
            event: "proposal",
            data: JSON.stringify({ actions: result.pendingActions.map((a: any) => ({ id: a.id, action: a.action, parameters: a.parameters })) }),
          });
          await stream.writeSSE({ id: String(id++), event: "done", data: JSON.stringify({ conversationId: convId, usage: result.usage }) });
        });
      },
    },
    {
      subPath: "/approve",
      method: "post",
      summary: "Approve or reject a pending action",
      description: "Approve or reject an action proposed by the human-in-the-loop agent",
      type: "json",
      handler: async (c: Context) => {
        const { id, approved } = await c.req.json();
        const result = await approveAction(id, approved);
        return c.json(result, 200);
      },
    },
  ],
});
