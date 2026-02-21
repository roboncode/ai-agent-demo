import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { toolRegistry } from "../../registry/tool-registry.js";

const router = createRouter();

// GET / — List all registered tools
router.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Tools"],
    summary: "List all registered tools",
    description: "Returns metadata for all registered tools including descriptions and input schemas",
    responses: {
      200: {
        description: "List of tools",
        content: {
          "application/json": {
            schema: z.object({
              tools: z.array(
                z.object({
                  name: z.string(),
                  description: z.string(),
                  category: z.string().optional(),
                  inputSchema: z.any(),
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
    const tools = toolRegistry.list().map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      inputSchema: t.inputSchema,
    }));
    return c.json({ tools, count: tools.length });
  },
);

// POST /:toolName — Execute a tool by name
router.openapi(
  createRoute({
    method: "post",
    path: "/{toolName}",
    tags: ["Tools"],
    summary: "Execute a tool by name",
    description: "Runs the named tool with the provided input",
    request: {
      params: z.object({
        toolName: z.string().openapi({ example: "getWeather" }),
      }),
      body: {
        content: { "application/json": { schema: z.any() } },
      },
    },
    responses: {
      200: {
        description: "Tool execution result",
        content: { "application/json": { schema: z.any() } },
      },
      404: {
        description: "Tool not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const name = c.req.param("toolName");
    const tool = toolRegistry.get(name);
    if (!tool) {
      return c.json({ error: `Tool not found: ${name}` }, 404);
    }

    const input = await c.req.json();
    const result = await toolRegistry.execute(name, input);
    return c.json(result, 200);
  },
);

export default router;
