import { apiReference } from "@scalar/hono-api-reference";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "../app.js";
import { env } from "../env.js";

export function configureOpenAPI(app: OpenAPIHono<AppBindings>) {
  // Register the API key security scheme so it appears in Scalar's auth UI
  app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: "API key required for all /api/* routes",
  });

  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "AI Agent Demo API",
      version: "1.0.0",
      description:
        "Demo service showcasing AI agent patterns: generation, tool use, specialized agents, supervisor routing, human-in-the-loop, memory persistence, parallel tasks, and coding agents.",
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: "Local dev" }],
    security: [{ ApiKeyAuth: [] }],
  });

  app.get(
    "/reference",
    apiReference({
      url: "/doc",
      theme: "kepler",
      layout: "modern",
      defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
      pageTitle: "AI Agent Demo - API Reference",
    })
  );
}
