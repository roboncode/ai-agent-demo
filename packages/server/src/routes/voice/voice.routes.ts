import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import { voiceManager } from "../../voice/voice-manager.js";
import { runSupervisorAgent } from "../../agents/supervisor-agent.js";
import { generateConversationId } from "../../registry/handler-factories.js";
import {
  speakRequestSchema,
  transcribeResponseSchema,
  speakersResponseSchema,
} from "./voice.schemas.js";
import { saveAudio, getAudio, deleteAudio, listAudio } from "../../voice/audio-store.js";
import { env } from "../../env.js";

const router = createRouter();

function requireVoice(name?: string) {
  const provider = voiceManager.get(name);
  if (!provider) {
    throw new Error("VOICE_UNAVAILABLE");
  }
  return provider;
}

// GET /speakers — List available voices
router.openapi(
  createRoute({
    method: "get",
    path: "/speakers",
    tags: ["Voice"],
    summary: "List available voice speakers",
    description: "Returns the list of available TTS voices from the configured provider",
    responses: {
      200: {
        description: "List of speakers",
        content: {
          "application/json": { schema: speakersResponseSchema },
        },
      },
      503: {
        description: "Voice provider not configured",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    let provider;
    try {
      provider = requireVoice();
    } catch {
      return c.json({ error: "Voice provider not configured. Set OPENAI_API_KEY to enable voice features." }, 503);
    }

    const speakers = await provider.getSpeakers();
    return c.json({
      speakers: speakers.map((s) => ({ voiceId: s.voiceId, name: s.name })),
      provider: provider.name,
    });
  },
);

// GET /providers — List available STT providers
router.openapi(
  createRoute({
    method: "get",
    path: "/providers",
    tags: ["Voice"],
    summary: "List available transcription providers",
    description: "Returns the configured STT providers and which is the default",
    responses: {
      200: {
        description: "List of providers",
        content: {
          "application/json": {
            schema: z.object({
              providers: z.array(z.object({
                name: z.string(),
                label: z.string(),
                isDefault: z.boolean(),
              })),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const providers = voiceManager.list();
    const defaultName = voiceManager.getDefault();
    return c.json({
      providers: providers.map((p) => ({ name: p.name, label: p.label, isDefault: p.name === defaultName })),
    });
  },
);

// POST /transcribe — Speech-to-text
router.openapi(
  createRoute({
    method: "post",
    path: "/transcribe",
    tags: ["Voice"],
    summary: "Transcribe audio to text",
    description: "Accepts an audio file (multipart/form-data) and returns the transcription. Use ?provider=groq to use Groq.",
    request: {
      query: z.object({
        provider: z.string().optional().openapi({ description: "Voice provider name (e.g. openai, groq)" }),
      }),
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              audio: z.any().openapi({ type: "string", format: "binary" }),
              language: z.string().optional(),
              prompt: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Transcription result",
        content: {
          "application/json": { schema: transcribeResponseSchema },
        },
      },
      400: {
        description: "No audio file provided",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
      503: {
        description: "Voice provider not configured",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const providerName = c.req.query("provider") || undefined;

    let provider;
    try {
      provider = requireVoice(providerName);
    } catch {
      const msg = providerName
        ? `Voice provider "${providerName}" not available. Check API key and config.`
        : "Voice provider not configured. Set OPENAI_API_KEY to enable voice features.";
      return c.json({ error: msg }, 503);
    }

    const formData = await c.req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return c.json({ error: "No audio file provided. Send a 'audio' field in multipart/form-data." }, 400);
    }

    const language = formData.get("language") as string | null;
    const prompt = formData.get("prompt") as string | null;

    const retainAudio = formData.get("retainAudio") === "true" || env.VOICE_RETAIN_AUDIO;

    const result = await provider.transcribe(audioFile, {
      language: language ?? undefined,
      prompt: prompt ?? undefined,
    });

    // Optionally retain the audio
    let audioId: string | undefined;
    if (retainAudio) {
      const buf = Buffer.from(await audioFile.arrayBuffer());
      const entry = await saveAudio(buf, audioFile.type || "audio/webm", {
        transcription: result.text,
        source: "transcribe",
      });
      audioId = entry.id;
    }

    return c.json({ ...result, provider: provider.name, ...(audioId && { audioId }) });
  },
);

// POST /speak — Text-to-speech
router.openapi(
  createRoute({
    method: "post",
    path: "/speak",
    tags: ["Voice"],
    summary: "Convert text to speech",
    description: "Accepts text and returns an audio stream",
    request: {
      body: {
        content: {
          "application/json": { schema: speakRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Audio stream",
      },
      503: {
        description: "Voice provider not configured",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    let provider;
    try {
      provider = requireVoice();
    } catch {
      return c.json({ error: "Voice provider not configured. Set OPENAI_API_KEY to enable voice features." }, 503);
    }

    const body = await c.req.json();
    const { text, speaker, format, speed, model, save } = body;

    const audioFormat = format ?? "mp3";
    const audioStream = await provider.speak(text, { speaker, format: audioFormat, speed, model });

    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      opus: "audio/opus",
      wav: "audio/wav",
      aac: "audio/aac",
      flac: "audio/flac",
    };
    const mimeType = mimeTypes[audioFormat] ?? "audio/mpeg";

    if (save) {
      // Buffer the stream so we can save and return the full audio
      const chunks: Uint8Array[] = [];
      const reader = audioStream instanceof ReadableStream
        ? audioStream.getReader()
        : null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } else {
        // Fallback: audioStream might be a Node readable or buffer
        for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        }
      }

      const buffer = Buffer.concat(chunks);
      const entry = await saveAudio(buffer, mimeType, {
        text,
        speaker,
        source: "speak",
      });

      return new Response(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(buffer.length),
          "X-Audio-Id": entry.id,
        },
      });
    }

    return new Response(audioStream, {
      headers: {
        "Content-Type": mimeType,
        "Transfer-Encoding": "chunked",
      },
    });
  },
);

// POST /converse — Full voice conversation cycle
router.openapi(
  createRoute({
    method: "post",
    path: "/converse",
    tags: ["Voice"],
    summary: "Voice conversation (audio in, audio out)",
    description:
      "Full cycle: transcribe audio → run supervisor agent → speak response. Returns audio stream with metadata in headers.",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              audio: z.any().openapi({ type: "string", format: "binary" }),
              speaker: z.string().optional(),
              format: z.string().optional(),
              speed: z.string().optional(),
              model: z.string().optional(),
              conversationId: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Audio response stream with X-Transcription and X-Response-Text headers",
      },
      400: {
        description: "No audio file provided",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
      503: {
        description: "Voice provider not configured",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    let provider;
    try {
      provider = requireVoice();
    } catch {
      return c.json({ error: "Voice provider not configured. Set OPENAI_API_KEY to enable voice features." }, 503);
    }

    const formData = await c.req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return c.json({ error: "No audio file provided. Send a 'audio' field in multipart/form-data." }, 400);
    }

    const speaker = (formData.get("speaker") as string) ?? undefined;
    const format = (formData.get("format") as string) ?? "mp3";
    const speed = formData.get("speed") ? parseFloat(formData.get("speed") as string) : undefined;
    const model = (formData.get("model") as string) ?? undefined;
    const conversationId = (formData.get("conversationId") as string) ?? undefined;

    // Step 1: Transcribe
    const transcription = await provider.transcribe(audioFile);

    if (!transcription.text.trim()) {
      return c.json({ error: "Could not transcribe audio. Please try again." }, 400);
    }

    // Step 2: Run supervisor agent
    const agentResult = await runSupervisorAgent(transcription.text, model);
    const responseText = agentResult.response;
    const convId = generateConversationId(conversationId);

    // Step 3: Speak response
    const audioFormat = (format as "mp3" | "opus" | "wav" | "aac" | "flac") ?? "mp3";
    const audioStream = await provider.speak(responseText, { speaker, format: audioFormat, speed });

    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      opus: "audio/opus",
      wav: "audio/wav",
      aac: "audio/aac",
      flac: "audio/flac",
    };

    return new Response(audioStream, {
      headers: {
        "Content-Type": mimeTypes[audioFormat] ?? "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "X-Transcription": encodeURIComponent(transcription.text),
        "X-Response-Text": encodeURIComponent(responseText),
        "X-Conversation-Id": convId,
      },
    });
  },
);

// ── Audio Retention Routes ──

// GET /audio — List stored audio entries
router.openapi(
  createRoute({
    method: "get",
    path: "/audio",
    tags: ["Voice"],
    summary: "List stored audio entries",
    description: "Returns metadata for all retained audio files",
    responses: {
      200: {
        description: "List of audio entries",
        content: {
          "application/json": {
            schema: z.object({
              entries: z.array(
                z.object({
                  id: z.string(),
                  mimeType: z.string(),
                  size: z.number(),
                  createdAt: z.string(),
                }),
              ),
              count: z.number(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const entries = await listAudio();
    return c.json({ entries, count: entries.length });
  },
);

// GET /audio/:id — Get a stored audio file
router.openapi(
  createRoute({
    method: "get",
    path: "/audio/{id}",
    tags: ["Voice"],
    summary: "Get stored audio file",
    description: "Returns the audio file data for a stored entry",
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: { description: "Audio file" },
      404: {
        description: "Audio not found",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  }),
  async (c) => {
    const id = c.req.param("id");
    const result = await getAudio(id);

    if (!result) {
      return c.json({ error: `Audio not found: ${id}` }, 404);
    }

    return new Response(result.data, {
      headers: {
        "Content-Type": result.entry.mimeType,
        "Content-Length": String(result.entry.size),
      },
    });
  },
);

// DELETE /audio/:id — Delete a stored audio file
router.openapi(
  createRoute({
    method: "delete",
    path: "/audio/{id}",
    tags: ["Voice"],
    summary: "Delete stored audio file",
    description: "Removes a stored audio file and its metadata",
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: "Deletion result",
        content: {
          "application/json": {
            schema: z.object({ deleted: z.boolean() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const id = c.req.param("id");
    const deleted = await deleteAudio(id);
    return c.json({ deleted });
  },
);

export default router;
