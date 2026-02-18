import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { env } from "../env.js";

export const authMiddleware = createMiddleware(async (c, next) => {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey || apiKey !== env.API_KEY) {
    throw new HTTPException(401, { message: "Invalid or missing API key" });
  }

  await next();
});
