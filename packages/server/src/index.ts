import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { configureOpenAPI } from "./lib/configure-openapi.js";
import { authMiddleware } from "./middleware/auth.js";
import { env } from "./env.js";
import indexRoute from "./routes/index.route.js";
import generateRoutes from "./routes/generate/generate.routes.js";
import toolsRoutes from "./routes/tools/tools.routes.js";
import agentsRoutes from "./routes/agents/agents.routes.js";
import memoryRoutes from "./routes/memory/memory.routes.js";

const app = createApp();

configureOpenAPI(app);

// Health check (no auth)
app.route("/", indexRoute);

// All /api routes require auth
app.use("/api/*", authMiddleware);

// Mount API routes
app.route("/api/generate", generateRoutes);
app.route("/api/tools", toolsRoutes);
app.route("/api/agents", agentsRoutes);
app.route("/api/memory", memoryRoutes);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
  console.log(`API docs: http://localhost:${info.port}/reference`);
});

export default app;
