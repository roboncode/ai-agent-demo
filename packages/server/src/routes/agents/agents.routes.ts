import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { agentRequestSchema, approveRequestSchema } from "./agents.schemas.js";
import * as handlers from "./agents.handlers.js";

const router = createRouter();

const agentResponse = {
  200: {
    description: "Agent response (JSON)",
    content: { "application/json": { schema: z.object({}).passthrough() } },
  },
};

const sseResponse = {
  200: {
    description: "SSE stream of agent events (text-delta, tool-call, tool-result, done)",
    content: { "text/event-stream": { schema: z.any() } },
  },
};

const agentBody = {
  content: { "application/json": { schema: agentRequestSchema } },
};

// Weather agent
router.openapi(
  createRoute({
    method: "post",
    path: "/weather",
    tags: ["Agents"],
    summary: "Weather specialist agent",
    description: "AI agent specialized in weather queries, using wttr.in data",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleWeatherAgent
);

// Hackernews agent
router.openapi(
  createRoute({
    method: "post",
    path: "/hackernews",
    tags: ["Agents"],
    summary: "Hacker News analyst agent",
    description: "AI agent specialized in Hacker News trending stories and tech news",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleHackernewsAgent
);

// Knowledge agent
router.openapi(
  createRoute({
    method: "post",
    path: "/knowledge",
    tags: ["Agents"],
    summary: "Movie recommender agent",
    description: "AI agent specialized in movie search, details, and recommendations via TMDB",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleKnowledgeAgent
);

// Supervisor agent
router.openapi(
  createRoute({
    method: "post",
    path: "/supervisor",
    tags: ["Agents"],
    summary: "Supervisor routing agent",
    description: "Routes queries to appropriate specialist agents (weather, hackernews, knowledge)",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleSupervisorAgent
);

// Memory agent
router.openapi(
  createRoute({
    method: "post",
    path: "/memory",
    tags: ["Agents"],
    summary: "Memory-enabled agent",
    description: "Agent with persistent memory - can save and recall information across conversations",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleMemoryAgent
);

// Human-in-the-loop agent
router.openapi(
  createRoute({
    method: "post",
    path: "/human-in-loop",
    tags: ["Agents"],
    summary: "Human-in-the-loop agent (propose action)",
    description: "Agent that proposes actions for human approval. Returns pending actions to approve/reject.",
    request: { body: agentBody },
    responses: agentResponse,
  }),
  handlers.handleHumanInLoopAgent
);

// Approve/reject pending action
router.openapi(
  createRoute({
    method: "post",
    path: "/human-in-loop/approve",
    tags: ["Agents"],
    summary: "Approve or reject a pending action",
    description: "Approve or reject an action proposed by the human-in-the-loop agent",
    request: {
      body: {
        content: { "application/json": { schema: approveRequestSchema } },
      },
    },
    responses: agentResponse,
  }),
  handlers.handleHumanInLoopApprove
);

// Recipe agent (structured output)
router.openapi(
  createRoute({
    method: "post",
    path: "/recipe",
    tags: ["Agents"],
    summary: "Structured output recipe agent",
    description: "Uses generateObject with a Zod schema to return a typed recipe JSON object",
    request: { body: agentBody },
    responses: agentResponse,
  }),
  handlers.handleRecipeAgent
);

// Guardrails agent (finance advisor with input validation)
router.openapi(
  createRoute({
    method: "post",
    path: "/guardrails",
    tags: ["Agents"],
    summary: "Guardrails finance advisor agent",
    description:
      "Two-phase agent: classifies input as finance-related or off-topic, then generates advice only for allowed queries",
    request: { body: agentBody },
    responses: agentResponse,
  }),
  handlers.handleGuardrailsAgent
);

// Task agent (parallel execution)
router.openapi(
  createRoute({
    method: "post",
    path: "/task",
    tags: ["Agents"],
    summary: "Parallel task delegation agent",
    description:
      "Breaks complex queries into parallel sub-tasks, delegates to specialist agents, and synthesizes results (streams status + synthesis)",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleTaskAgent
);

// Coding agent
router.openapi(
  createRoute({
    method: "post",
    path: "/coding",
    tags: ["Agents"],
    summary: "Code generation and execution agent",
    description: "Agent that writes and executes JavaScript code in a sandboxed environment",
    request: { body: agentBody },
    responses: sseResponse,
  }),
  handlers.handleCodingAgent
);

export default router;
