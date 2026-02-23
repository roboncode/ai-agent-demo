import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../app.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { toolRegistry } from "../registry/tool-registry.js";

const router = createRouter();

const healthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: {
      description: "Server is healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            timestamp: z.string(),
            agents: z.number(),
            tools: z.number(),
          }),
        },
      },
    },
  },
});

router.openapi(healthRoute, (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    agents: agentRegistry.list().length,
    tools: toolRegistry.list().length,
  });
});

export default router;
