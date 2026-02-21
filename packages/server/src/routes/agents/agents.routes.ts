import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { agentRegistry } from "../../registry/agent-registry.js";
import { agentRequestSchema, agentPatchSchema } from "./agents.schemas.js";
import { saveOverride, deleteOverride } from "../../storage/prompt-store.js";
import { loadMemoriesForIds } from "../../storage/memory-store.js";

const router = createRouter();

const agentBody = {
  content: { "application/json": { schema: agentRequestSchema } },
};

const jsonResponse = {
  200: {
    description: "JSON response",
    content: { "application/json": { schema: z.any() } },
  },
};

const sseResponse = {
  200: {
    description: "SSE stream of agent events (text-delta, tool-call, tool-result, done)",
    content: { "text/event-stream": { schema: z.any() } },
  },
};

// GET / — List all registered agents
router.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Agents"],
    summary: "List all registered agents",
    description: "Returns metadata for all registered agents",
    responses: {
      200: {
        description: "List of agents",
        content: {
          "application/json": {
            schema: z.object({
              agents: z.array(
                z.object({
                  name: z.string(),
                  description: z.string(),
                  type: z.string(),
                  toolNames: z.array(z.string()),
                  hasPromptOverride: z.boolean(),
                  subRoutes: z.array(z.string()).optional(),
                }),
              ),
              count: z.number(),
            }),
          },
        },
      },
    },
  }),
  (c) => {
    const agents = agentRegistry.list().map((a) => ({
      name: a.name,
      description: a.description,
      type: a.type,
      toolNames: a.toolNames,
      hasPromptOverride: agentRegistry.hasPromptOverride(a.name),
      subRoutes: a.subRoutes?.map((sr) => `${sr.method.toUpperCase()} /${a.name}${sr.subPath}`),
    }));
    return c.json({ agents, count: agents.length });
  },
);

// GET /:agentName — Get agent details including current system prompt
router.openapi(
  createRoute({
    method: "get",
    path: "/{agentName}",
    tags: ["Agents"],
    summary: "Get agent details",
    description: "Returns agent metadata and current system prompt",
    request: {
      params: z.object({
        agentName: z.string().openapi({ example: "weather" }),
      }),
    },
    responses: {
      200: {
        description: "Agent details",
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
              description: z.string(),
              type: z.string(),
              toolNames: z.array(z.string()),
              systemPrompt: z.string(),
              isDefault: z.boolean(),
            }),
          },
        },
      },
      404: {
        description: "Agent not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  (c) => {
    const name = c.req.param("agentName");
    const agent = agentRegistry.get(name);
    if (!agent) {
      return c.json({ error: `Agent not found: ${name}` }, 404);
    }
    return c.json({
      name: agent.name,
      description: agent.description,
      type: agent.type,
      toolNames: agent.toolNames,
      systemPrompt: agentRegistry.getResolvedPrompt(name)!,
      isDefault: !agentRegistry.hasPromptOverride(name),
    });
  },
);

// PATCH /:agentName — Update system prompt or reset to default
router.openapi(
  createRoute({
    method: "patch",
    path: "/{agentName}",
    tags: ["Agents"],
    summary: "Update agent system prompt",
    description: "Set a custom system prompt or reset to default",
    request: {
      params: z.object({
        agentName: z.string().openapi({ example: "weather" }),
      }),
      body: {
        content: { "application/json": { schema: agentPatchSchema } },
      },
    },
    responses: {
      200: {
        description: "Prompt updated",
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
              systemPrompt: z.string(),
              isDefault: z.boolean(),
            }),
          },
        },
      },
      404: {
        description: "Agent not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("agentName");
    const agent = agentRegistry.get(name);
    if (!agent) {
      return c.json({ error: `Agent not found: ${name}` }, 404);
    }

    const body = await c.req.json();

    if (body.reset) {
      agentRegistry.resetPrompt(name);
      await deleteOverride(name);
    } else if (body.system) {
      agentRegistry.setPromptOverride(name, body.system);
      await saveOverride(name, body.system);
    }

    return c.json({
      name,
      systemPrompt: agentRegistry.getResolvedPrompt(name)!,
      isDefault: !agentRegistry.hasPromptOverride(name),
    });
  },
);

// Dynamic sub-routes — must be registered before the catch-all POST /:agentName
// We register known sub-route patterns for each agent that has them
function mountSubRoutes() {
  for (const agent of agentRegistry.list()) {
    if (!agent.subRoutes) continue;
    for (const sub of agent.subRoutes) {
      const path = `/${agent.name}${sub.subPath}` as `/${string}`;
      const responses = sub.type === "stream" ? sseResponse : jsonResponse;

      router.openapi(
        createRoute({
          method: sub.method,
          path,
          tags: ["Agents"],
          summary: sub.summary,
          description: sub.description,
          request: { body: agentBody },
          responses,
        }),
        sub.handler as any,
      );
    }
  }
}

// POST /:agentName — Dynamic dispatch
router.openapi(
  createRoute({
    method: "post",
    path: "/{agentName}",
    tags: ["Agents"],
    summary: "Execute an agent",
    description: "Dispatches to the named agent. Response type depends on the agent (SSE or JSON).",
    request: {
      params: z.object({
        agentName: z.string().openapi({ example: "weather" }),
      }),
      body: agentBody,
    },
    responses: {
      ...sseResponse,
      404: {
        description: "Agent not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("agentName");
    const agent = agentRegistry.get(name);
    if (!agent) {
      return c.json({ error: `Agent not found: ${name}` }, 404);
    }

    const systemPrompt = agentRegistry.getResolvedPrompt(name)!;

    // Load memory context if memoryIds provided
    let memoryContext: string | undefined;
    try {
      const body = await c.req.json();
      if (body.memoryIds && Array.isArray(body.memoryIds) && body.memoryIds.length > 0) {
        const memories = await loadMemoriesForIds(body.memoryIds);
        if (memories.length > 0) {
          memoryContext = memories
            .map((m) => `[${m.namespace}] ${m.key}: ${m.value}`)
            .join("\n");
        }
      }
    } catch {
      // body parsing may fail on re-read, that's fine
    }

    return agent.handler(c, { systemPrompt, memoryContext });
  },
);

export function mountAgentRoutes() {
  mountSubRoutes();
}

export default router;
