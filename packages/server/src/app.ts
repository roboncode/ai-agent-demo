import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

export type AppBindings = {
  Variables: Record<string, never>;
};

export function createApp() {
  const app = new OpenAPIHono<AppBindings>();

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  });

  app.notFound((c) => {
    return c.json({ error: "Not Found" }, 404);
  });

  return app;
}

export function createRouter() {
  return new OpenAPIHono<AppBindings>();
}
