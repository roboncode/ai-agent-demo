import { generateText } from "ai";
import { z } from "zod";
import { getModel } from "../lib/ai-provider.js";

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

When the user asks you to do something, propose the action using one of these tools:
- sendEmail: Propose sending an email
- deleteData: Propose deleting data
- publishContent: Propose publishing content

IMPORTANT: You are proposing actions, not executing them. Describe clearly what you want to do so the human can approve or reject it.`;

// Schema-only tools (no execute function) - AI proposes but doesn't auto-execute
const proposalTools = {
  sendEmail: {
    description: "Propose sending an email to a recipient",
    parameters: z.object({
      to: z.string().describe("Email recipient"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body content"),
    }),
  },
  deleteData: {
    description: "Propose deleting data from the system",
    parameters: z.object({
      resource: z.string().describe("The resource to delete"),
      reason: z.string().describe("Reason for deletion"),
    }),
  },
  publishContent: {
    description: "Propose publishing content",
    parameters: z.object({
      title: z.string().describe("Content title"),
      content: z.string().describe("Content body"),
      platform: z.string().describe("Target platform"),
    }),
  },
};

function generateId() {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runHumanInLoopAgent(message: string, model?: string) {
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: proposalTools,
  });

  // Intercept tool calls and store as pending actions
  const proposals: PendingAction[] = [];

  for (const step of result.steps) {
    for (const toolCall of step.toolCalls) {
      const id = generateId();
      const action: PendingAction = {
        id,
        action: toolCall.toolName,
        description: `${toolCall.toolName} with params: ${JSON.stringify(toolCall.args)}`,
        parameters: toolCall.args as Record<string, unknown>,
        status: "pending_approval",
        createdAt: new Date().toISOString(),
      };
      pendingActions.set(id, action);
      proposals.push(action);
    }
  }

  if (proposals.length === 0) {
    return {
      response: result.text || "I couldn't determine an action to propose. Could you be more specific?",
      pendingActions: [],
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
