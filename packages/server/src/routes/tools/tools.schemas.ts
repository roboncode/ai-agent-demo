import { z } from "zod";

export const weatherRequestSchema = z.object({
  location: z.string().min(1).openapi({ example: "Tokyo" }),
});

export const hackernewsRequestSchema = z.object({
  limit: z.number().min(1).max(30).default(10).openapi({ example: 10 }),
});

export const movieSearchRequestSchema = z.object({
  query: z.string().min(1).openapi({ example: "Inception" }),
});
