import { createApp } from "./app.js";
import { configureOpenAPI } from "./lib/configure-openapi.js";
import { authMiddleware } from "./middleware/auth.js";
import { env } from "./env.js";
import indexRoute from "./routes/index.route.js";
import generateRoutes from "./routes/generate/generate.routes.js";
import toolsRoutes from "./routes/tools/tools.routes.js";
import agentsRoutes from "./routes/agents/agents.routes.js";
import memoryRoutes from "./routes/memory/memory.routes.js";
import { createWebSocketHandler } from "./routes/ws/ws.route.js";

const app = createApp();

configureOpenAPI(app);

// Health check (no auth)
app.route("/health", indexRoute);

// All /api routes require auth
app.use("/api/*", authMiddleware);

// Mount API routes
app.route("/api/generate", generateRoutes);
app.route("/api/tools", toolsRoutes);
app.route("/api/agents", agentsRoutes);
app.route("/api/memory", memoryRoutes);

// In production, serve the built client as static files
if (process.env.NODE_ENV === "production") {
  const { serveStatic } = await import("hono/bun");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const clientDist = resolve(__dirname, "../../client/dist");

  app.use("*", serveStatic({ root: clientDist }));
  app.get("*", serveStatic({ root: clientDist, path: "index.html" }));
}

const wsHandler = createWebSocketHandler(app);

console.log(`Server running on http://localhost:${env.PORT}`);
console.log(`API docs: http://localhost:${env.PORT}/reference`);

export default {
  port: env.PORT,
  fetch(req: Request, server: any) {
    if (new URL(req.url).pathname === "/api/ws") {
      const upgraded = server.upgrade(req, {
        data: { authenticated: false },
      });
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket: wsHandler,
  idleTimeout: 120,
};
