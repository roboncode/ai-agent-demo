import { generateText, tool } from "ai";
import { z } from "zod";
import { getModel, extractUsage } from "../lib/ai-provider.js";

interface PendingAction {
  id: string;
  action: string;
  description: string;
  parameters: Record<string, unknown>;
  status: "pending_approval" | "approved" | "rejected";
  result?: unknown;
  createdAt: string;
}

// In-memory store for pending actions
const pendingActions = new Map<string, PendingAction>();

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
        createdAt: new Date().toISOString(),
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
    // Simulate execution
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

  pendingActions.set(id, action);

  return {
    id: action.id,
    action: action.action,
    status: action.status,
    result: action.result,
  };
}
