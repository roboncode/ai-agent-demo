import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import {
  generateRequestSchema,
  generateResponseSchema,
} from "./generate.schemas.js";
import * as handlers from "./generate.handlers.js";

const router = createRouter();

// POST / (mounted at /api/generate)
// Use ?format=json (default) or ?format=sse
router.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["RAG"],
    summary: "Generate text",
    description:
      "Generate a response from the AI model. Optionally provide tools. Use ?format=sse for streaming.",
    request: {
      body: {
        content: {
          "application/json": { schema: generateRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Generated response (JSON or SSE stream depending on format query param)",
        content: {
          "application/json": { schema: generateResponseSchema },
        },
      },
    },
  }),
  (c) => {
    const format = (c.req.query("format") ?? "json") as "json" | "sse";
    if (format === "sse") {
      return handlers.handleGenerateStream(c);
    }
    return handlers.handleGenerate(c);
  }
);

export default router;
