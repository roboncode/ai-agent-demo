import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../env.js";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const getModel = (id?: string) => openrouter(id ?? env.DEFAULT_MODEL);
