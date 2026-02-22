import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { conversationStore } from "../../storage/conversation-store.js";

const router = createRouter();

// GET / — List all conversations
router.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Conversations"],
    summary: "List all conversations",
    responses: {
      200: {
        description: "All conversations",
        content: {
          "application/json": {
            schema: z.object({
              conversations: z.array(
                z.object({
                  id: z.string(),
                  messageCount: z.number(),
                  updatedAt: z.string(),
                }),
              ),
              count: z.number(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const conversations = await conversationStore.list();
    return c.json({ conversations, count: conversations.length }, 200);
  },
);

// GET /:id — Get full conversation with messages
router.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Conversations"],
    summary: "Get a conversation",
    request: {
      params: z.object({ id: z.string().openapi({ example: "conv_kanban_taskboard" }) }),
    },
    responses: {
      200: {
        description: "Full conversation",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
              messages: z.array(
                z.object({
                  role: z.enum(["user", "assistant"]),
                  content: z.string(),
                  timestamp: z.string(),
                }),
              ),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          },
        },
      },
      404: {
        description: "Conversation not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.param();
    const conv = await conversationStore.get(id);
    if (!conv) return c.json({ error: "Conversation not found" }, 404);
    return c.json(conv, 200);
  },
);

// POST / — Create a new conversation
router.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Conversations"],
    summary: "Create a new conversation",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({ id: z.string().openapi({ example: "conv_kanban_taskboard" }) }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created conversation",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
              messages: z.array(z.any()),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { id } = await c.req.json();
    const conv = await conversationStore.create(id);
    return c.json(conv, 200);
  },
);

// DELETE /:id — Delete a conversation
router.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Conversations"],
    summary: "Delete a conversation",
    request: {
      params: z.object({ id: z.string().openapi({ example: "conv_kanban_taskboard" }) }),
    },
    responses: {
      200: {
        description: "Conversation deleted",
        content: {
          "application/json": {
            schema: z.object({ deleted: z.boolean(), id: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.param();
    const deleted = await conversationStore.delete(id);
    return c.json({ deleted, id }, 200);
  },
);

// DELETE /:id/messages — Clear messages but keep conversation
router.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/messages",
    tags: ["Conversations"],
    summary: "Clear conversation messages",
    request: {
      params: z.object({ id: z.string().openapi({ example: "conv_kanban_taskboard" }) }),
    },
    responses: {
      200: {
        description: "Messages cleared",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
              messages: z.array(z.any()),
              createdAt: z.string(),
              updatedAt: z.string(),
            }),
          },
        },
      },
      404: {
        description: "Conversation not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.param();
    try {
      const conv = await conversationStore.clear(id);
      return c.json(conv, 200);
    } catch {
      return c.json({ error: "Conversation not found" }, 404);
    }
  },
);

export default router;
