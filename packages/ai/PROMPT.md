# @jombee/ai -- Plugin Reference

This document describes the `@jombee/ai` Hono plugin package: a closure-based factory
that adds a full AI agent system (routing, tools, memory, skills, voice, streaming) to
any Hono v4 application. It is built on Vercel AI SDK v6 and uses Zod for all
schema validation.

**Tech stack:**
- Hono v4 + `@hono/zod-openapi` + `@scalar/hono-api-reference`
- Vercel AI SDK v6 (`ai@^6`) -- uses `stepCountIs()` for max steps, `inputSchema` for tool definitions
- AI SDK v6 stream chunk properties: `.text` (not `.textDelta`), `.input` (not `.args`), `.output` (not `.result`)
- Zod for schema validation
- File-based JSON storage in `data/` directory by default (`StorageProvider` is swappable)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [Creating Tools](#3-creating-tools)
4. [Creating Agents](#4-creating-agents)
5. [Orchestrator](#5-orchestrator)
6. [Memory](#6-memory)
7. [Skills](#7-skills)
8. [Voice](#8-voice)
9. [Storage Backends](#9-storage-backends)
10. [Event System](#10-event-system)
11. [Card Extractors](#11-card-extractors)
12. [Configuration](#12-configuration)
13. [API Endpoints](#13-api-endpoints)

---

## 1. Overview

`@jombee/ai` exposes a single factory function, `createAIPlugin(config)`, that returns
an `AIPluginInstance`. The instance contains:

- `app` -- an `OpenAPIHono` sub-application to mount on a parent Hono server
- `agents` -- an `AgentRegistry` for registering agent definitions
- `tools` -- a `ToolRegistry` for registering AI SDK tool definitions
- `cards` -- a `CardRegistry` for extracting UI card data from tool results
- `voice` -- a `VoiceManager` (only present when voice config is provided)
- `initialize()` -- async method that loads prompt overrides and finalizes setup

The closure pattern means all internal state (registries, storage, model resolver) is
captured inside the factory and shared by all route handlers. There is no global
singleton -- you can create multiple independent plugin instances if needed.

**Architecture pattern:**

```
createAIPlugin(config)
  |
  +-- PluginContext (internal, shared by all routes)
  |     agents: AgentRegistry
  |     tools: ToolRegistry
  |     cards: CardRegistry
  |     storage: StorageProvider
  |     getModel: (id?) => LanguageModel
  |     voice?: VoiceManager
  |
  +-- OpenAPIHono sub-app
        /health
        /generate
        /tools
        /agents
        /agents/:agentName
        /memory
        /skills
        /conversations
        /voice (conditional)
```

---

## 2. Quick Start

### Install peer dependencies

```bash
bun add hono @hono/zod-openapi ai zod @jombee/ai
```

### Create and mount the plugin

```ts
import { Hono } from "hono";
import { createAIPlugin, createFileStorage, createApiKeyAuth } from "@jombee/ai";
import { openrouter } from "@openrouter/ai-sdk-provider";

const app = new Hono();

const plugin = createAIPlugin({
  getModel: (id) => openrouter(id ?? "openai/gpt-4o-mini"),
  storage: createFileStorage({ dataDir: "./data" }),
  authMiddleware: createApiKeyAuth("my-secret-key"),
  defaultMaxSteps: 5,
  maxDelegationDepth: 3,
  openapi: {
    title: "My AI API",
    version: "1.0.0",
  },
});

// Register tools and agents (see sections below)
// ...

// Mount the plugin on a base path
app.route("/ai", plugin.app);

// Initialize (loads prompt overrides from storage)
await plugin.initialize();

export default { port: 3000, fetch: app.fetch };
```

### Register a tool and an agent

```ts
import { tool } from "ai";
import { z } from "zod";
import { makeRegistryHandlers } from "@jombee/ai";

// 1. Define an AI SDK v6 tool
const getWeather = tool({
  description: "Get weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    return { location, temperature: 72, condition: "sunny" };
  },
});

// 2. Register the tool
plugin.tools.register({
  name: "getWeather",
  description: "Get weather for a location",
  inputSchema: z.object({ location: z.string() }),
  tool: getWeather,
  category: "weather",
});

// 3. Register an agent that uses the tool
const tools = { getWeather };
const { sseHandler, jsonHandler } = makeRegistryHandlers({ tools }, pluginCtx);

plugin.agents.register({
  name: "weather",
  description: "Provides weather information for any location",
  toolNames: ["getWeather"],
  defaultFormat: "sse",
  defaultSystem: "You are a weather assistant. Use the getWeather tool to answer questions.",
  tools,
  sseHandler,
  jsonHandler,
});
```

### Register an orchestrator

```ts
import { createOrchestratorAgent } from "@jombee/ai";

// The orchestrator auto-discovers all non-orchestrator agents
createOrchestratorAgent(pluginCtx, {
  name: "orchestrator",
  description: "Routes queries to specialist agents",
  autonomous: true,
});
```

---

## 3. Creating Tools

Tools use the Vercel AI SDK v6 `tool()` function with Zod schemas.

### Tool definition

```ts
import { tool } from "ai";
import { z } from "zod";

const myTool = tool({
  description: "What this tool does",
  inputSchema: z.object({
    param1: z.string().describe("Description of param1"),
    param2: z.number().optional().describe("Optional numeric param"),
  }),
  execute: async ({ param1, param2 }) => {
    // Perform work and return a result object
    return { result: "value" };
  },
});
```

**AI SDK v6 notes:**
- Use `inputSchema` (not `parameters`)
- The `execute` function receives the parsed input and must return a serializable value
- Tool results appear as `.output` in stream chunks (not `.result`)
- Tool call arguments appear as `.input` in stream chunks (not `.args`)

### Registering with ToolRegistry

```ts
plugin.tools.register({
  name: "myTool",
  description: "What this tool does",
  inputSchema: z.object({ param1: z.string() }),
  tool: myTool,
  category: "general",            // optional grouping
  directExecute: async (input) => {
    // Optional: non-AI direct execution path
    return { result: "direct" };
  },
});
```

The `ToolRegistry` provides:

| Method | Description |
|--------|-------------|
| `register(reg)` | Add a tool to the registry |
| `get(name)` | Retrieve a tool registration by name |
| `list()` | List all registered tools |
| `execute(name, input)` | Execute a tool directly (uses `directExecute` if available, otherwise calls `tool.execute`) |

### ToolRegistration interface

```ts
interface ToolRegistration {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  tool: any;                         // AI SDK tool() return value
  directExecute?: (input: any) => Promise<any>;
  category?: string;
}
```

---

## 4. Creating Agents

### AgentRegistration interface

```ts
interface AgentRegistration {
  name: string;                      // Unique agent identifier
  description: string;               // Shown to orchestrator for routing decisions
  tags?: string[];                   // Optional categorization
  toolNames: string[];               // Tool names (for display/metadata)
  defaultFormat: "json" | "sse";     // Default response format
  defaultSystem: string;             // Default system prompt
  tools?: Record<string, any>;       // AI SDK tool map for execution
  jsonHandler?: AgentHandler;        // Handler for JSON responses
  sseHandler?: AgentHandler;         // Handler for SSE streaming responses
  actions?: ActionRegistration[];    // Custom sub-endpoints
  agents?: string[];                 // (Orchestrators only) explicit routing list
  isOrchestrator?: boolean;          // Marks as orchestrator (cannot be delegated to)
}
```

### AgentHandler signature

```ts
type AgentHandler = (
  c: Context,
  options: { systemPrompt: string; memoryContext?: string },
) => Response | Promise<Response>;
```

The `systemPrompt` is the resolved prompt (accounting for overrides). `memoryContext`
is formatted memory entries when `memoryIds` are provided in the request.

### Using makeRegistryHandlers

The simplest way to create both handlers is with `makeRegistryHandlers`:

```ts
import { makeRegistryHandlers } from "@jombee/ai";

const tools = { getWeather, getLocation };

const { sseHandler, jsonHandler } = makeRegistryHandlers(
  { tools, maxSteps: 5 },
  pluginContext,
);

plugin.agents.register({
  name: "weather",
  description: "Weather agent",
  toolNames: ["getWeather", "getLocation"],
  defaultFormat: "sse",
  defaultSystem: "You are a weather assistant...",
  tools,
  sseHandler,
  jsonHandler,
});
```

You can also create them individually:

```ts
import { makeRegistryStreamHandler, makeRegistryJsonHandler } from "@jombee/ai";

const sseHandler = makeRegistryStreamHandler({ tools }, pluginContext);
const jsonHandler = makeRegistryJsonHandler({ tools }, pluginContext);
```

### Custom agent actions

Agents can register sub-endpoints (actions) for custom operations:

```ts
plugin.agents.register({
  name: "my-agent",
  // ...standard fields...
  actions: [
    {
      name: "approve",
      method: "post",
      summary: "Approve a pending action",
      description: "Confirms an action that was awaiting user approval",
      handler: async (c) => {
        const body = await c.req.json();
        // ... approval logic ...
        return c.json({ approved: true });
      },
    },
  ],
});
// Accessible at POST /agents/my-agent/approve
```

### Prompt overrides

Agent system prompts can be overridden at runtime via the API:

```ts
// Programmatically
plugin.agents.setPromptOverride("weather", "New system prompt...");

// Via API
// PATCH /agents/weather { "system": "New system prompt..." }
// PATCH /agents/weather { "reset": true }  // revert to default
```

Overrides persist across restarts via the `PromptStore`. They are loaded during
`plugin.initialize()`.

---

## 5. Orchestrator

The orchestrator agent is the top-level coordinator that routes user queries to
specialist agents. It uses two internal tools: `routeToAgent` and `createTask`.

### Creating an orchestrator

```ts
import { createOrchestratorAgent } from "@jombee/ai";

const registration = createOrchestratorAgent(pluginContext, {
  name: "orchestrator",
  description: "Routes queries to specialist agents",
  systemPrompt: "Custom orchestrator prompt...",  // optional, has a good default
  agents: ["weather", "tasks"],                   // optional, auto-discovers if omitted
  autonomous: true,                               // default: true
});
```

### OrchestratorAgentConfig

```ts
interface OrchestratorAgentConfig {
  name: string;                   // Agent name (e.g. "orchestrator")
  description?: string;           // Description for metadata
  systemPrompt?: string;          // Override the default orchestrator prompt
  agents?: string[];              // Explicit list of routable agents (omit for auto-discovery)
  autonomous?: boolean;           // When false, may pause for user approval/input
}
```

### How routing works

1. The orchestrator receives the user message with a list of available agents and skills
2. For single-domain queries: calls `routeToAgent(agent, query, skills?)` for immediate delegation
3. For multi-domain queries: calls `createTask(agent, query, skills?)` multiple times to build a parallel plan
4. Tasks run in parallel via `Promise.all`, then results are synthesized by a final LLM call

### Plan mode

When `planMode: true` is sent in the request body:
- The orchestrator only has access to `createTask` (not `routeToAgent`)
- It builds a plan of tasks but does not execute them
- The response includes `awaitingApproval: true` and a `tasks` array
- The client can then send `approvedPlan` to execute the tasks

### Approved plan flow

```ts
// Client sends:
{
  "message": "original query",
  "approvedPlan": [
    { "agent": "weather", "query": "weather in NYC", "skills": ["eli5"] },
    { "agent": "news", "query": "latest news in NYC" }
  ]
}
// The orchestrator skips planning and immediately executes + synthesizes
```

### Non-autonomous mode

When `autonomous: false`, the orchestrator surfaces `_clarify` tool calls as `ask:user` SSE events and returns `awaitingApproval: true` for multi-task plans instead of auto-executing.

### Delegation depth and safety

- Max delegation depth: configurable via `maxDelegationDepth` (default: 3)
- Self-delegation and circular delegation (`A -> B -> A`) are detected and blocked
- Orchestrators (`isOrchestrator: true`) cannot be delegation targets
- Delegation chain tracked via `AsyncLocalStorage` (`delegationStore`)

### Task execution internals

`executeTask(ctx, agent, query, skills?)`:
1. Validates the target agent exists and is not an orchestrator; checks delegation depth/circularity
2. Injects query-phase skill content into the system prompt; adds `_clarify` tool
3. Runs the agent via `runAgent()` (`generateText`); emits `delegate:start`/`delegate:end` on the bus
4. Returns `TaskResult` with response, tools used, usage, and response-phase skills

---

## 6. Memory

Memory provides namespaced key-value storage for persistent agent context.

### Concepts

- **Namespace**: a grouping identifier (e.g. `"user-123"`, `"project-abc"`)
- **Entry**: a key-value pair with optional context string
- **Memory injection**: pass `memoryIds` (namespace IDs) in agent requests to load memory as context

### How memory injection works

When an agent request includes `memoryIds`:

```json
{
  "message": "What is my favorite color?",
  "memoryIds": ["user-123", "preferences"]
}
```

The framework:
1. Calls `storage.memory.loadMemoriesForIds(["user-123", "preferences"])`
2. Formats entries as: `[namespace] key: value`
3. Appends a `## Memory Context` section to the system prompt

### MemoryStore interface

```ts
interface MemoryStore {
  listNamespaces(): Promise<string[]>;
  listEntries(namespaceId: string): Promise<MemoryEntry[]>;
  saveEntry(namespaceId: string, key: string, value: string, context?: string): Promise<MemoryEntry>;
  getEntry(namespaceId: string, key: string): Promise<MemoryEntry | null>;
  deleteEntry(namespaceId: string, key: string): Promise<boolean>;
  clearNamespace(namespaceId: string): Promise<void>;
  loadMemoriesForIds(ids: string[]): Promise<Array<MemoryEntry & { namespace: string }>>;
}

interface MemoryEntry {
  key: string;
  value: string;
  context: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. Skills

Skills are behavioral instructions stored as markdown documents with YAML frontmatter.
The orchestrator selects relevant skills when routing queries, and the framework injects
their content into agent system prompts.

### Skill document format

```markdown
---
name: eli5
description: Explains things like the user is 5 years old
tags: [style, simplify]
phase: response
---
# ELI5

## Instructions
When responding, use very simple language. Avoid jargon.
Use analogies a young child would understand.
Keep sentences short. Use examples from everyday life.
```

### Frontmatter fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique skill identifier (kebab-case) |
| `description` | `string` | Shown to the orchestrator for selection |
| `tags` | `string[]` | Categorization tags |
| `phase` | `"query" \| "response" \| "both"` | When the skill is injected |

### Skill phases

- **query**: Injected into the specialist agent's system prompt before execution. Affects how the agent processes the query and generates its response.
- **response**: Injected into the orchestrator's synthesis prompt. Affects how the final user-facing response is composed.
- **both**: Injected at both phases.

### Injection mechanism

1. Orchestrator passes `skills: ["eli5"]` when calling `routeToAgent` or `createTask`
2. In `executeTask`, query-phase skills are appended to the agent's system prompt under `# Active Skills`
3. Response-phase skill names are returned as `responseSkills` and loaded during synthesis
4. A `skill:inject` SSE event is emitted so clients can track which skills were applied

### SkillStore interface

```ts
interface SkillStore {
  listSkills(): Promise<SkillMeta[]>;
  getSkill(name: string): Promise<Skill | null>;
  createSkill(name: string, content: string): Promise<Skill>;
  updateSkill(name: string, content: string): Promise<Skill>;
  deleteSkill(name: string): Promise<boolean>;
  getSkillSummaries(): Promise<string>;  // formatted for system prompt injection
}
```

---

## 8. Voice

Voice support is optional and activated by providing `voice` config to the plugin.

### VoiceProvider interface

```ts
interface VoiceProvider {
  readonly name: string;
  readonly label: string;
  transcribe(audio: Blob | Buffer, options?: TranscribeOptions): Promise<TranscribeResult>;
  speak(text: string, options?: SpeakOptions): Promise<ReadableStream<Uint8Array>>;
  getSpeakers(): Promise<VoiceSpeaker[]>;
}

interface TranscribeOptions {
  language?: string;
  prompt?: string;
  model?: string;
}

interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

interface SpeakOptions {
  speaker?: string;
  format?: "mp3" | "opus" | "wav" | "aac" | "flac";
  speed?: number;
  model?: string;
}

interface VoiceSpeaker {
  voiceId: string;
  name: string;
  [key: string]: unknown;
}
```

### OpenAIVoiceProvider

A built-in implementation using OpenAI's TTS and STT APIs:

```ts
import { OpenAIVoiceProvider } from "@jombee/ai";

const voiceProvider = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  ttsModel: "tts-1",                    // default
  sttModel: "gpt-4o-mini-transcribe",   // default
  defaultSpeaker: "alloy",              // default
});

plugin.voice?.register(voiceProvider);
```

### VoiceManager

The `VoiceManager` holds multiple providers and picks one by name or default:

```ts
class VoiceManager {
  register(provider: VoiceProvider): void;
  get(name?: string): VoiceProvider | undefined;
  list(): VoiceProvider[];
  listNames(): string[];
  getDefault(): string | null;
  isAvailable(): boolean;
}
```

### /converse flow

The `/voice/converse` endpoint provides a full voice conversation cycle:

1. Client sends audio as `multipart/form-data`
2. Server transcribes audio to text
3. Server runs the text through an agent (orchestrator or specified agent)
4. Server converts the agent response to audio via TTS
5. Server streams audio back with metadata headers:
   - `X-Transcription`: URI-encoded user transcript
   - `X-Response-Text`: URI-encoded agent response
   - `X-Conversation-Id`: conversation tracking ID

---

## 9. Storage Backends

The plugin requires a `StorageProvider` which aggregates six sub-stores:

```ts
interface StorageProvider {
  conversations: ConversationStore;
  memory: MemoryStore;
  skills: SkillStore;
  tasks: TaskStore;
  prompts: PromptStore;
  audio: AudioStore;
}
```

### Built-in file storage

```ts
import { createFileStorage } from "@jombee/ai";

const storage = createFileStorage({ dataDir: "./data" });
```

This creates JSON files under `./data/` for each sub-store.

### Implementing a custom backend

Each sub-store is an independent interface. You can mix backends (e.g. Postgres for
conversations, S3 for audio). Implement only the methods defined in each interface.

```ts
import type { StorageProvider, ConversationStore } from "@jombee/ai";

class PostgresConversationStore implements ConversationStore {
  constructor(private db: Pool) {}

  async get(id: string) {
    const row = await this.db.query("SELECT * FROM conversations WHERE id = $1", [id]);
    return row.rows[0] ? deserialize(row.rows[0]) : null;
  }
  async list() { /* SELECT id, message_count, updated_at ... */ }
  async create(id: string) { /* INSERT INTO conversations ... */ }
  async append(id: string, message: ConversationMessage) { /* upsert + append */ }
  async delete(id: string) { /* DELETE FROM conversations ... */ }
  async clear(id: string) { /* UPDATE messages = '[]' ... */ }
}

// Combine stores into a provider
const storage: StorageProvider = {
  conversations: new PostgresConversationStore(pool),
  memory: new PostgresMemoryStore(pool),
  skills: new PostgresSkillStore(pool),
  tasks: new PostgresTaskStore(pool),
  prompts: new PostgresPromptStore(pool),
  audio: new S3AudioStore(s3Client, bucketName),
};
```

### Key sub-store contracts

- `get()`/`getEntry()`/`getSkill()`: return `null` when not found, never throw
- `append()`: auto-create the conversation if it does not exist
- `loadMemoriesForIds()`: aggregate entries across multiple namespaces
- `getSkillSummaries()`: return a formatted string suitable for system prompt injection
- `cleanupOlderThan()`: garbage-collect old audio entries

---

## 10. Event System

The plugin uses two event layers: **SSE events** sent to HTTP clients, and **bus events**
circulated internally via `AgentEventBus`.

### SSE_EVENTS (client-facing)

```ts
const SSE_EVENTS = {
  SESSION_START:  "session:start",
  TEXT_DELTA:     "text-delta",
  TOOL_CALL:      "tool-call",
  TOOL_RESULT:    "tool-result",
  DONE:           "done",
  CANCELLED:      "cancelled",
  AGENT_START:    "agent:start",
  AGENT_END:      "agent:end",
  AGENT_THINK:    "agent:think",
  AGENT_PLAN:     "agent:plan",
  ASK_USER:       "ask:user",
  DELEGATE_START: "delegate:start",
  DELEGATE_END:   "delegate:end",
  SKILL_INJECT:   "skill:inject",
};
```

### BUS_EVENTS (internal)

```ts
const BUS_EVENTS = {
  TEXT_DELTA:     "text:delta",
  TOOL_CALL:      "tool:call",
  TOOL_RESULT:    "tool:result",
  DELEGATE_START: "delegate:start",
  DELEGATE_END:   "delegate:end",
  SKILL_INJECT:   "skill:inject",
};
```

### BUS_TO_SSE_MAP

Maps bus events to their SSE equivalents. Only events in `FORWARDED_BUS_EVENTS`
are forwarded from the internal bus to SSE clients:

```ts
const BUS_TO_SSE_MAP = {
  "delegate:start": "delegate:start",
  "delegate:end":   "delegate:end",
  "tool:call":      "tool-call",
  "tool:result":    "tool-result",
  "skill:inject":   "skill:inject",
};
```

### AgentEventBus

A simple synchronous pub/sub bus that propagates through the delegation tree:

```ts
class AgentEventBus {
  subscribe(handler: (event: AgentEvent) => void | Promise<void>): () => void;
  emit(type: string, data: Record<string, unknown>): void;
}

interface AgentEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}
```

The bus is created per top-level SSE request and passed down through `DelegationContext`
via `AsyncLocalStorage`. Sub-agents emit events; the orchestrator forwards them to the client.

### SSE streaming protocol

All SSE responses follow this format:

```
event: <event-name>
data: <JSON string>
id: <sequential integer>

```

#### Full SSE event sequence (orchestrator with delegation)

```
event: session:start
data: {"conversationId":"conv_1234_abc"}

event: agent:start
data: {"agent":"orchestrator"}

event: delegate:start
data: {"from":"orchestrator","to":"weather","query":"weather in NYC"}

event: tool-call
data: {"toolName":"getWeather","args":{"location":"NYC"}}

event: tool-result
data: {"toolName":"getWeather","result":{"temperature":72,"condition":"sunny"}}

event: delegate:end
data: {"from":"orchestrator","to":"weather","summary":"The weather in NYC is..."}

event: agent:think
data: {"text":"Synthesizing results..."}

event: text-delta
data: {"text":"The weather"}

event: text-delta
data: {"text":" in New York"}

event: text-delta
data: {"text":" is currently 72 degrees and sunny."}

event: agent:end
data: {"agent":"orchestrator"}

event: done
data: {"toolsUsed":["routeToAgent","getWeather"],"conversationId":"conv_1234_abc","usage":{"inputTokens":150,"outputTokens":80,"totalTokens":230,"cost":0.0003,"durationMs":1245}}
```

#### SSE event data shapes

| Event | Data Shape |
|-------|-----------|
| `session:start` | `{ conversationId: string }` |
| `agent:start` | `{ agent: string }` |
| `agent:end` | `{ agent: string }` |
| `agent:think` | `{ text: string }` |
| `agent:plan` | `{ tasks: Array<{ agent: string, query: string, skills?: string[] }> }` |
| `text-delta` | `{ text: string }` |
| `tool-call` | `{ toolName: string, args: object }` |
| `tool-result` | `{ toolName: string, result: any }` |
| `delegate:start` | `{ from: string, to: string, query: string }` |
| `delegate:end` | `{ from: string, to: string, summary: string }` |
| `skill:inject` | `{ agent: string, skills: string[], phase: "query" \| "response" }` |
| `ask:user` | `{ items: ClarifyItem[] }` |
| `done` | `{ toolsUsed: string[], conversationId: string, usage: UsageInfo, tasks?: TaskSummary[], awaitingApproval?: boolean, awaitingResponse?: boolean }` |
| `cancelled` | `{ conversationId: string }` |

#### ClarifyItem types

```ts
type ClarifyItem =
  | { type: "question"; text: string; context?: string }
  | { type: "option"; text: string; choices: string[]; context?: string }
  | { type: "confirmation"; text: string; context?: string }
  | { type: "action"; text: string; context?: string }
  | { type: "warning"; text: string; context?: string }
  | { type: "info"; text: string };
```

#### UsageInfo shape

```ts
interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
  durationMs: number;
}
```

### Request cancellation

Active SSE streams can be cancelled by conversation ID via `POST /agents/cancel`
or programmatically with `cancelRequest("conv_1234_abc")`. On cancellation, the
stream emits a `cancelled` event and closes.

---

## 11. Card Extractors

Card extractors inspect tool results during streaming and produce typed UI card data
(e.g. weather cards, link previews) without hardcoding tool-specific logic in the
orchestrator.

### CardRegistry

```ts
class CardRegistry {
  register(extractor: CardExtractor): () => void;  // returns unsubscribe fn
  extract(toolName: string, result: unknown): CardData[];
}

type CardExtractor = (toolName: string, result: unknown) => CardData | null;

interface CardData {
  type: string;
  data: Record<string, unknown>;
}
```

### Registering an extractor

```ts
plugin.cards.register((toolName, result) => {
  if (toolName === "getWeather" && result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (r.location && r.temperature) {
      return {
        type: "weather",
        data: {
          location: r.location,
          temperature: r.temperature,
          condition: r.condition,
        },
      };
    }
  }
  return null;
});
```

### How cards flow through streaming

1. The orchestrator's `bridgeBusToStream` subscribes to the `AgentEventBus`
2. On `tool:result` events, it calls `cardRegistry.extract(toolName, result)` and collects cards
3. Cards are attached as metadata when saving assistant messages to conversation storage

---

## 12. Configuration

### AIPluginConfig

```ts
interface AIPluginConfig {
  /** Returns a LanguageModel for the given model ID (or default) */
  getModel: (id?: string) => LanguageModel;

  /** Storage provider (use createFileStorage() for file-based) */
  storage: StorageProvider;

  /** Optional auth middleware applied to all routes except /health */
  authMiddleware?: MiddlewareHandler;

  /** Voice configuration (omit to disable voice routes entirely) */
  voice?: VoiceConfig;

  /** Maximum delegation nesting depth (default: 3) */
  maxDelegationDepth?: number;

  /** Default max AI SDK steps per agent call (default: 5) */
  defaultMaxSteps?: number;

  /** OpenAPI doc metadata */
  openapi?: {
    title?: string;
    version?: string;
    description?: string;
    serverUrl?: string;
  };
}

interface VoiceConfig {
  /** Whether to retain audio files server-side */
  retainAudio?: boolean;
}
```

### DEFAULTS constant

```ts
const DEFAULTS = {
  MAX_DELEGATION_DEPTH: 3,
  MAX_STEPS: 5,
  SYNTHESIS_MESSAGE: "Synthesizing results...",
  RESPONSE_SKILLS_KEY: "_responseSkills",
};
```

### TOOL_NAMES constant

```ts
const TOOL_NAMES = {
  ROUTE_TO_AGENT: "routeToAgent",
  CREATE_TASK: "createTask",
  CLARIFY: "_clarify",
};
```

### Auth

The built-in auth middleware checks the `X-API-Key` header:

```ts
import { createApiKeyAuth } from "@jombee/ai";

const auth = createApiKeyAuth("my-secret-key");
// Throws HTTPException(401) if header is missing or incorrect
```

The `/health` endpoint is always unauthenticated. All other routes go through the
auth middleware if one is configured.

---

## 13. API Endpoints

All endpoints are mounted under the plugin's base path (e.g. `/ai`).
Routes marked with `[Auth]` require the configured auth middleware.

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (no auth required) |

**Response:** `{ status: "ok" }`

---

### Generate [Auth]

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| `POST` | `/generate` | `format=json` (default) | Generate text with optional tools (JSON response) |
| `POST` | `/generate` | `format=sse` | Generate text with streaming (SSE response) |

**Request body:**

```json
{
  "prompt": "Explain what an AI agent is",
  "systemPrompt": "You are a helpful assistant",
  "model": "openai/gpt-4o-mini",
  "tools": ["myTool"],
  "maxSteps": 5
}
```

**JSON response:**

```json
{
  "text": "An AI agent is...",
  "model": "openai/gpt-4o-mini",
  "usage": { "inputTokens": 25, "outputTokens": 150, "totalTokens": 175 },
  "toolResults": [],
  "finishReason": "stop"
}
```

**SSE response:** streams `text-delta` events followed by `done`.

---

### Tools [Auth]

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tools` | List all registered tools |

**Response:** `{ tools: [...], count: number }`

---

### Agents [Auth]

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/agents` | List all registered agents |
| `GET` | `/agents/{agentName}` | Get agent details and system prompt |
| `PATCH` | `/agents/{agentName}` | Update or reset agent system prompt |
| `POST` | `/agents/{agentName}` | Execute agent (`?format=json\|sse`) |
| `POST` | `/agents/{agentName}/{action}` | Execute a named agent action |
| `POST` | `/agents/cancel` | Cancel an active agent stream |

**POST /agents/{agentName} request body:**

```json
{
  "message": "What is the weather in NYC?",
  "conversationId": "conv_optional_id",
  "model": "openai/gpt-4o-mini",
  "memoryIds": ["user-123"],
  "planMode": false,
  "approvedPlan": null,
  "autonomous": true
}
```

**GET /agents response:** `{ agents: [{ name, description, defaultFormat, formats, toolNames, hasPromptOverride, isOrchestrator?, agents? }], count }`

**PATCH /agents/{agentName}:** `{ "system": "..." }` to override or `{ "reset": true }` to revert.

**POST /agents/cancel:** `{ "conversationId": "conv_1234_abc" }` -- Response: `{ cancelled, conversationId }`

---

### Memory [Auth]

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/memory` | List all memory namespaces |
| `GET` | `/memory/{id}` | List all entries in a namespace |
| `POST` | `/memory/{id}` | Save a memory entry |
| `GET` | `/memory/{id}/{key}` | Get a specific entry |
| `DELETE` | `/memory/{id}/{key}` | Delete a specific entry |
| `DELETE` | `/memory/{id}` | Clear all entries in a namespace |

**POST /memory/{id}:** `{ key: string, value: string, context?: string }`

**Response (MemoryEntry):** `{ key, value, context, createdAt, updatedAt }`

---

### Skills [Auth]

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/skills` | List all skills (metadata only) |
| `GET` | `/skills/{name}` | Get full skill by name |
| `POST` | `/skills` | Create a new skill |
| `PUT` | `/skills/{name}` | Update a skill |
| `DELETE` | `/skills/{name}` | Delete a skill |

**POST /skills:** `{ name: string (kebab-case), content: string (markdown with frontmatter) }`

**Skill names must be kebab-case:** `^[a-z0-9]+(-[a-z0-9]+)*$`

**Response (Skill):** `{ name, description, tags, phase, content, rawContent, updatedAt }`

---

### Conversations [Auth]

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/conversations` | List all conversations (summaries: id, messageCount, updatedAt) |
| `GET` | `/conversations/{id}` | Get full conversation with messages |
| `POST` | `/conversations` | Create a new empty conversation (`{ id: string }`) |
| `DELETE` | `/conversations/{id}` | Delete a conversation |
| `DELETE` | `/conversations/{id}/messages` | Clear messages (keep conversation record) |

Messages have shape: `{ role: "user"|"assistant", content: string, timestamp: string, metadata?: object }`

---

### Voice [Auth] (conditional -- only mounted when voice config is provided)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/voice/speakers` | List available TTS speakers |
| `GET` | `/voice/providers` | List available voice providers |
| `POST` | `/voice/transcribe` | Transcribe audio to text (multipart/form-data) |
| `POST` | `/voice/speak` | Convert text to speech audio stream |
| `POST` | `/voice/converse` | Full voice cycle: transcribe, agent, speak (multipart/form-data) |
| `GET` | `/voice/audio` | List stored audio entries |
| `GET` | `/voice/audio/{id}` | Get stored audio file |
| `DELETE` | `/voice/audio/{id}` | Delete stored audio file |

**POST /voice/transcribe** (multipart/form-data): Fields: `audio` (File, required), `language?`, `prompt?`. Query: `?provider=openai`. Response: `{ text, language?, duration?, provider }`

**POST /voice/speak:** `{ text, speaker?, format?, speed?, model?, save? }`. Returns audio stream. When `save: true`, includes `X-Audio-Id` header.

**POST /voice/converse** (multipart/form-data): Fields: `audio` (File, required), `speaker?`, `format?`, `speed?`, `model?`, `conversationId?`, `agent?`. Returns audio stream with headers: `X-Transcription`, `X-Response-Text`, `X-Conversation-Id`.

---

## Exports Summary

Key exports from `@jombee/ai` (see `src/index.ts` for the complete list):

| Category | Exports |
|----------|---------|
| Factory | `createAIPlugin`, `AIPluginConfig`, `AIPluginInstance`, `VoiceConfig`, `PluginContext` |
| Registries | `AgentRegistry`, `ToolRegistry`, `makeRegistryHandlers`, `makeRegistryStreamHandler`, `makeRegistryJsonHandler`, `generateConversationId` |
| Registry types | `AgentRegistration`, `ToolRegistration`, `AgentHandler`, `ActionRegistration` |
| Agent utilities | `createOrchestratorAgent`, `DEFAULT_ORCHESTRATOR_PROMPT`, `executeTask`, `AgentEventBus`, `runAgent`, `streamAgentResponse` |
| Agent types | `OrchestratorAgentConfig`, `TaskResult`, `ClarifyItem`, `AgentEvent` |
| Constants | `SSE_EVENTS`, `BUS_EVENTS`, `BUS_TO_SSE_MAP`, `FORWARDED_BUS_EVENTS`, `TOOL_NAMES`, `DEFAULTS` |
| Card registry | `CardRegistry`, `CardData`, `CardExtractor` |
| AI provider | `UsageInfo`, `extractUsage`, `extractStreamUsage`, `mergeUsage` |
| Delegation | `delegationStore`, `getEventBus`, `getAbortSignal`, `DelegationContext` |
| Request mgmt | `registerRequest`, `cancelRequest`, `unregisterRequest` |
| Storage types | `StorageProvider`, `ConversationStore`, `MemoryStore`, `SkillStore`, `TaskStore`, `PromptStore`, `AudioStore` (+ entry/model types) |
| Storage impl | `createFileStorage`, `FileStorageOptions` |
| Voice | `VoiceProvider`, `VoiceManager`, `OpenAIVoiceProvider`, `OpenAIVoiceProviderConfig` |
| Auth | `createApiKeyAuth` |
