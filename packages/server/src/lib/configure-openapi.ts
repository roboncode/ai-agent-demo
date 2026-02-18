import { apiReference } from "@scalar/hono-api-reference";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "../app.js";

export function configureOpenAPI(app: OpenAPIHono<AppBindings>) {
  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "AI Agent Demo API",
      version: "1.0.0",
      description:
        "Demo service showcasing AI agent patterns: generation, tool use, specialized agents, supervisor routing, human-in-the-loop, memory persistence, parallel tasks, and coding agents.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local dev" }],
  });

  app.get(
    "/reference",
    apiReference({
      spec: { url: "/doc" },
      theme: "kepler",
      layout: "modern",
      defaultHttpClient: { targetKey: "javascript", clientKey: "fetch" },
      pageTitle: "AI Agent Demo - API Reference",
    })
  );
}
