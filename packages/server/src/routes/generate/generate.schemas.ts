import { z } from "zod";

export const generateRequestSchema = z.object({
  prompt: z.string().min(1).openapi({ example: "Explain what an AI agent is" }),
  systemPrompt: z
    .string()
    .optional()
    .openapi({ example: "You are a helpful assistant" }),
  model: z
    .string()
    .optional()
    .openapi({ example: "openai/gpt-4o-mini" }),
  tools: z
    .array(
      z.enum([
        "getWeather",
        "getTopStories",
        "getStoryDetail",
        "searchMovies",
        "getMovieDetail",
      ])
    )
    .optional()
    .openapi({ example: ["getWeather"] }),
  maxSteps: z.number().min(1).max(10).default(5),
});

export const generateResponseSchema = z.object({
  text: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  toolResults: z.array(z.object({}).passthrough()).optional(),
  finishReason: z.string(),
});
