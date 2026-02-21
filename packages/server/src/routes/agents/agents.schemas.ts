import { z } from "zod";

export const agentRequestSchema = z.object({
  message: z.string().min(1).openapi({ example: "What's the weather in Tokyo?" }),
  conversationId: z.string().optional(),
  model: z.string().optional().openapi({ example: "openai/gpt-4o-mini" }),
  memoryIds: z.array(z.string()).optional().openapi({
    example: ["user-123"],
    description: "Memory namespace IDs to load as context",
  }),
});

export const agentResponseSchema = z.object({
  response: z.string(),
  conversationId: z.string(),
  toolsUsed: z.array(z.string()),
});

export const approveRequestSchema = z.object({
  id: z.string().min(1).openapi({ example: "action_123_abc" }),
  approved: z.boolean().openapi({ example: true }),
});

export const agentPatchSchema = z.object({
  system: z.string().optional().openapi({
    example: "You are a helpful assistant.",
    description: "New system prompt to use for this agent",
  }),
  reset: z.boolean().optional().openapi({
    example: true,
    description: "Reset system prompt to default",
  }),
});
