import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

export const env = createEnv({
  server: {
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
    DEFAULT_MODEL: z.string().default("openai/gpt-4o-mini"),
    API_KEY: z.string().default("demo"),
    PORT: z.coerce.number().default(3000),
    TMDB_API_KEY: z.string().default(""),
    OPENAI_API_KEY: z.string().default(""),
    VOICE_PROVIDER: z.string().default("openai"),
    VOICE_TTS_MODEL: z.string().default("tts-1"),
    VOICE_STT_MODEL: z.string().default("whisper-1"),
    VOICE_DEFAULT_SPEAKER: z.string().default("alloy"),
    VOICE_RETAIN_AUDIO: z.coerce.boolean().default(false),
    GROQ_API_KEY: z.string().default(""),
    BRAVE_API_KEY: z.string().default(""),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: false,
});
