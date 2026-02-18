import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { memoryEntrySchema } from "./memory.schemas.js";
import * as handlers from "./memory.handlers.js";

const router = createRouter();

// GET / - List all memories
router.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Memory"],
    summary: "List all stored memories",
    responses: {
      200: {
        description: "All memories",
        content: {
          "application/json": {
            schema: z.object({
              memories: z.array(memoryEntrySchema),
              count: z.number(),
            }),
          },
        },
      },
    },
  }),
  handlers.handleListMemories
);

// GET /:id - Get specific memory
router.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Memory"],
    summary: "Get a specific memory by key",
    request: {
      params: z.object({ id: z.string().openapi({ example: "user_name" }) }),
    },
    responses: {
      200: {
        description: "Memory entry",
        content: {
          "application/json": { schema: memoryEntrySchema },
        },
      },
      404: {
        description: "Memory not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  handlers.handleGetMemory
);

// DELETE /:id - Delete specific memory
router.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Memory"],
    summary: "Delete a specific memory",
    request: {
      params: z.object({ id: z.string().openapi({ example: "user_name" }) }),
    },
    responses: {
      200: {
        description: "Memory deleted",
        content: {
          "application/json": {
            schema: z.object({ deleted: z.boolean(), key: z.string() }),
          },
        },
      },
      404: {
        description: "Memory not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  handlers.handleDeleteMemory
);

// DELETE / - Clear all memories
router.openapi(
  createRoute({
    method: "delete",
    path: "/",
    tags: ["Memory"],
    summary: "Clear all memories",
    responses: {
      200: {
        description: "All memories cleared",
        content: {
          "application/json": {
            schema: z.object({ cleared: z.boolean() }),
          },
        },
      },
    },
  }),
  handlers.handleClearMemories
);

export default router;
