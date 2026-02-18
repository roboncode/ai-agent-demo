import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { agentRequestSchema, approveRequestSchema } from "./agents.schemas.js";
import * as handlers from "./agents.handlers.js";

const router = createRouter();

const agentResponse = {
  200: {
    description: "Agent response",
    content: { "application/json": { schema: z.object({}).passthrough() } },
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
    responses: agentResponse,
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
    responses: agentResponse,
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
    responses: agentResponse,
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
    responses: agentResponse,
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
    responses: agentResponse,
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

// Task agent (parallel execution)
router.openapi(
  createRoute({
    method: "post",
    path: "/task",
    tags: ["Agents"],
    summary: "Parallel task delegation agent",
    description:
      "Breaks complex queries into parallel sub-tasks, delegates to specialist agents, and synthesizes results",
    request: { body: agentBody },
    responses: agentResponse,
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
    responses: agentResponse,
  }),
  handlers.handleCodingAgent
);

export default router;
