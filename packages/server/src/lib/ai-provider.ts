import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "../env.js";

const openrouter = createOpenAICompatible({
  name: "openrouter",
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const getModel = (id?: string) => openrouter(id ?? env.DEFAULT_MODEL);
