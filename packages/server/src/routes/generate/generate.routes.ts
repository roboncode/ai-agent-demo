import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import {
  generateRequestSchema,
  generateResponseSchema,
} from "./generate.schemas.js";
import * as handlers from "./generate.handlers.js";

const router = createRouter();

// POST / (mounted at /api/generate)
router.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Generation"],
    summary: "Generate text (non-streaming)",
    description:
      "Generate a response from the AI model. Optionally provide tools for the model to use.",
    request: {
      body: {
        content: {
          "application/json": { schema: generateRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Generated response",
        content: {
          "application/json": { schema: generateResponseSchema },
        },
      },
    },
  }),
  handlers.handleGenerate
);

// POST /stream (mounted at /api/generate/stream)
router.openapi(
  createRoute({
    method: "post",
    path: "/stream",
    tags: ["Generation"],
    summary: "Generate text (streaming SSE)",
    description:
      "Stream a response from the AI model via Server-Sent Events. Events: text-delta, tool-result, done.",
    request: {
      body: {
        content: {
          "application/json": { schema: generateRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "SSE stream of text deltas, tool results, and completion",
        content: {
          "text/event-stream": { schema: z.any() },
        },
      },
    },
  }),
  handlers.handleGenerateStream
);

export default router;
