/**
 * Smoke test for @jombee/ai plugin.
 * Run with: bun test packages/ai/test/smoke.test.ts
 */
import { describe, test, expect } from "bun:test";
import { createAIPlugin, createFileStorage, makeRegistryHandlers, SSE_EVENTS, BUS_EVENTS, BUS_TO_SSE_MAP, FORWARDED_BUS_EVENTS, STATUS_CODES, TOOL_NAMES, DEFAULTS, CardRegistry, DEFAULT_ORCHESTRATOR_PROMPT, createInMemoryMemoryStore, buildToolDescription, isRetryableError, withResilience, needsCompaction } from "../src/index.js";
import type { Conversation } from "../src/index.js";
import { Hono } from "hono";
import { tool } from "ai";
import { z } from "zod";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

// Mock LanguageModel that satisfies the interface minimally
const mockGetModel = () => ({
  specificationVersion: "v1" as const,
  provider: "mock",
  modelId: "mock-model",
  defaultObjectGenerationMode: "json" as const,
  doGenerate: async () => ({
    text: "Hello",
    finishReason: "stop" as const,
    usage: { promptTokens: 10, completionTokens: 5 },
    rawCall: { rawPrompt: "", rawSettings: {} },
  }),
  doStream: async () => ({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "text-delta", textDelta: "Hello" });
        controller.enqueue({ type: "finish", finishReason: "stop", usage: { promptTokens: 10, completionTokens: 5 } });
        controller.close();
      },
    }),
    rawCall: { rawPrompt: "", rawSettings: {} },
  }),
});

describe("@jombee/ai smoke test", () => {
  let tmpDir: string;
  let ai: ReturnType<typeof createAIPlugin>;

  test("createAIPlugin returns a valid instance", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "ai-test-"));

    ai = createAIPlugin({
      getModel: mockGetModel as any,
      storage: createFileStorage({ dataDir: tmpDir }),
    });

    expect(ai).toBeDefined();
    expect(ai.app).toBeDefined();
    expect(ai.agents).toBeDefined();
    expect(ai.tools).toBeDefined();
    expect(ai.cards).toBeDefined();
    expect(ai.cards).toBeInstanceOf(CardRegistry);
    expect(ai.initialize).toBeFunction();
  });

  test("can register a tool and agent", () => {
    const greetTool = tool({
      description: "Greet someone",
      parameters: z.object({ name: z.string() }),
      execute: async ({ name }) => `Hello, ${name}!`,
    });

    ai.tools.register({
      name: "greet",
      description: "Greet someone",
      inputSchema: z.object({ name: z.string() }),
      tool: greetTool,
      category: "test",
    });

    expect(ai.tools.list()).toHaveLength(1);
    expect(ai.tools.get("greet")).toBeDefined();

    ai.agents.register({
      name: "test-agent",
      description: "A test agent",
      toolNames: ["greet"],
      defaultFormat: "json",
      defaultSystem: "You are a test agent.",
      tools: { greet: greetTool },
    });

    expect(ai.agents.list()).toHaveLength(1);
    expect(ai.agents.get("test-agent")).toBeDefined();
  });

  test("initialize() runs without error", async () => {
    await ai.initialize();
  });

  test("GET /health returns 200", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status", "ok");
  });

  test("GET /agents returns registered agents", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/agents");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.count).toBe(1);
    expect(body.agents[0].name).toBe("test-agent");
    expect(body.agents[0].toolNames).toEqual(["greet"]);
  });

  test("GET /agents/test-agent returns agent details", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/agents/test-agent");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toBe("test-agent");
    expect(body.systemPrompt).toBe("You are a test agent.");
    expect(body.isDefault).toBe(true);
  });

  test("GET /tools returns registered tools", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/tools");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.count).toBe(1);
    expect(body.tools[0].name).toBe("greet");
  });

  test("GET /memory returns empty namespaces initially", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/memory");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.namespaces).toEqual([]);
  });

  test("GET /conversations returns empty initially", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/conversations");
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.conversations).toEqual([]);
  });

  test("404 for unknown routes", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/nonexistent");
    expect(res.status).toBe(404);
  });

  test("voice routes not mounted when voice not configured", async () => {
    const outerApp = new Hono();
    outerApp.route("/ai", ai.app);

    const res = await outerApp.request("/ai/voice/speakers");
    expect(res.status).toBe(404);
  });

  test("exports event and tool constants", () => {
    expect(SSE_EVENTS.TEXT_DELTA).toBe("text-delta");
    expect(SSE_EVENTS.DONE).toBe("done");
    expect(SSE_EVENTS.SESSION_START).toBe("session:start");
    expect(BUS_EVENTS.TOOL_CALL).toBe("tool:call");
    expect(BUS_EVENTS.DELEGATE_START).toBe("delegate:start");
    expect(TOOL_NAMES.ROUTE_TO_AGENT).toBe("routeToAgent");
    expect(TOOL_NAMES.CREATE_TASK).toBe("createTask");
    expect(TOOL_NAMES.CLARIFY).toBe("clarify");
    expect(TOOL_NAMES.MEMORY).toBe("memory");
    expect(DEFAULTS.MAX_DELEGATION_DEPTH).toBe(3);
    expect(DEFAULTS.MAX_STEPS).toBe(5);
  });

  test("exports DEFAULT_ORCHESTRATOR_PROMPT", () => {
    expect(DEFAULT_ORCHESTRATOR_PROMPT).toBeString();
    expect(DEFAULT_ORCHESTRATOR_PROMPT).toContain("orchestrator");
  });

  test("CardRegistry extracts cards from tool results", () => {
    const registry = new CardRegistry();

    // Register a weather card extractor
    const unsub = registry.register((toolName, result: any) => {
      if (toolName === "getWeather" && result?.location) {
        return { type: "weather", data: result };
      }
      return null;
    });

    // Should extract a card
    const cards = registry.extract("getWeather", { location: "Tokyo", temp: 22 });
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe("weather");
    expect(cards[0].data).toEqual({ location: "Tokyo", temp: 22 });

    // Should return empty for non-matching tool
    expect(registry.extract("otherTool", { foo: "bar" })).toHaveLength(0);

    // Unsubscribe should remove the extractor
    unsub();
    expect(registry.extract("getWeather", { location: "Tokyo" })).toHaveLength(0);
  });

  test("createInMemoryMemoryStore works (set/get/list/delete)", async () => {
    const store = createInMemoryMemoryStore();

    // set + get
    const entry = await store.saveEntry("test-ns", "color", "blue", "user preference");
    expect(entry.key).toBe("color");
    expect(entry.value).toBe("blue");
    expect(entry.context).toBe("user preference");

    const retrieved = await store.getEntry("test-ns", "color");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.value).toBe("blue");

    // list
    await store.saveEntry("test-ns", "name", "Alice");
    const entries = await store.listEntries("test-ns");
    expect(entries).toHaveLength(2);

    const namespaces = await store.listNamespaces();
    expect(namespaces).toContain("test-ns");

    // loadMemoriesForIds
    const loaded = await store.loadMemoriesForIds(["test-ns"]);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].namespace).toBe("test-ns");

    // delete
    const deleted = await store.deleteEntry("test-ns", "color");
    expect(deleted).toBe(true);
    expect(await store.getEntry("test-ns", "color")).toBeNull();

    // delete non-existent
    expect(await store.deleteEntry("test-ns", "nonexistent")).toBe(false);

    // clearNamespace
    await store.clearNamespace("test-ns");
    expect(await store.listEntries("test-ns")).toHaveLength(0);
  });

  test("buildToolDescription formats examples correctly", () => {
    // Without examples — returns base description unchanged
    expect(buildToolDescription("Get weather")).toBe("Get weather");
    expect(buildToolDescription("Get weather", [])).toBe("Get weather");

    // With examples
    const result = buildToolDescription("Get weather", [
      { name: "Minimal", input: { city: "London" } },
      { name: "Full", input: { city: "London", units: "metric" }, description: "Explicit metric units" },
    ]);

    expect(result).toContain("Get weather");
    expect(result).toContain("<examples>");
    expect(result).toContain("</examples>");
    expect(result).toContain('<example name="Minimal">');
    expect(result).toContain('{"city":"London"}');
    expect(result).toContain("Explicit metric units");
  });

  test("isRetryableError classifies errors correctly", () => {
    // Retryable: 429
    const err429 = Object.assign(new Error("Rate limit 429"), { status: 429 });
    expect(isRetryableError(err429)).toBe(true);

    // Retryable: 500
    const err500 = Object.assign(new Error("Server error 500"), { status: 500 });
    expect(isRetryableError(err500)).toBe(true);

    // Retryable: timeout
    const errTimeout = new Error("Request timed out");
    expect(isRetryableError(errTimeout)).toBe(true);

    // Retryable: overloaded
    const errOverloaded = new Error("Model is overloaded");
    expect(isRetryableError(errOverloaded)).toBe(true);

    // Not retryable: 401
    const err401 = Object.assign(new Error("Unauthorized 401"), { status: 401 });
    expect(isRetryableError(err401)).toBe(false);

    // Not retryable: 400
    const err400 = Object.assign(new Error("Bad request 400"), { status: 400 });
    expect(isRetryableError(err400)).toBe(false);

    // Not retryable: AbortError
    const errAbort = new DOMException("Aborted", "AbortError");
    expect(isRetryableError(errAbort)).toBe(false);

    // Not an error
    expect(isRetryableError("string")).toBe(false);
  });

  test("withResilience retries on retryable error and succeeds", async () => {
    let attempts = 0;
    const mockCtx = {
      config: { resilience: { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50, jitterFactor: 0 } },
    } as any;

    const result = await withResilience({
      fn: async () => {
        attempts++;
        if (attempts < 3) throw Object.assign(new Error("Rate limit 429"), { status: 429 });
        return "success";
      },
      ctx: mockCtx,
    });

    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  test("withResilience calls onFallback when retries exhaust", async () => {
    let fallbackCalled = false;
    const mockCtx = {
      config: {
        resilience: {
          maxRetries: 1,
          baseDelayMs: 10,
          maxDelayMs: 50,
          jitterFactor: 0,
          onFallback: async (context: any) => {
            fallbackCalled = true;
            expect(context.retryCount).toBe(1);
            expect(context.currentModel).toBe("test-model");
            return "fallback-model";
          },
        },
      },
    } as any;

    let lastModelOverride: string | undefined;
    const result = await withResilience({
      fn: async (overrideModel) => {
        lastModelOverride = overrideModel;
        if (!overrideModel) throw Object.assign(new Error("Server error"), { status: 500 });
        return "fallback-success";
      },
      ctx: mockCtx,
      modelId: "test-model",
    });

    expect(fallbackCalled).toBe(true);
    expect(lastModelOverride).toBe("fallback-model");
    expect(result).toBe("fallback-success");
  });

  test("needsCompaction returns correct threshold check", () => {
    const makeConv = (count: number): Conversation => ({
      id: "test",
      messages: Array.from({ length: count }, (_, i) => ({
        role: "user" as const,
        content: `msg ${i}`,
        timestamp: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Under default threshold (20)
    expect(needsCompaction(makeConv(10))).toBe(false);
    expect(needsCompaction(makeConv(20))).toBe(false);

    // Over default threshold
    expect(needsCompaction(makeConv(21))).toBe(true);

    // Custom threshold
    expect(needsCompaction(makeConv(5), 4)).toBe(true);
    expect(needsCompaction(makeConv(4), 4)).toBe(false);
  });

  test("guard hook blocks execution when allowed: false", () => {
    // Register an agent with a guard
    ai.agents.register({
      name: "guarded-agent",
      description: "An agent with a guard",
      toolNames: ["greet"],
      defaultFormat: "json",
      defaultSystem: "You are a guarded agent.",
      tools: { greet: tool({ description: "Greet", parameters: z.object({ name: z.string() }), execute: async ({ name }) => `Hi ${name}` }) },
      guard: (query) => {
        if (query.includes("blocked")) return { allowed: false, reason: "Query contains blocked content" };
        return { allowed: true };
      },
    });

    const reg = ai.agents.get("guarded-agent");
    expect(reg).toBeDefined();
    expect(reg!.guard).toBeFunction();

    // Guard blocks
    const blockResult = reg!.guard!("this is blocked content", "guarded-agent");
    expect(blockResult).toEqual({ allowed: false, reason: "Query contains blocked content" });

    // Guard allows
    const allowResult = reg!.guard!("normal query", "guarded-agent");
    expect(allowResult).toEqual({ allowed: true });
  });

  test("exports new constants (ERROR event, compaction defaults)", () => {
    expect(SSE_EVENTS.ERROR).toBe("error");
    expect(DEFAULTS.COMPACTION_THRESHOLD).toBe(20);
    expect(DEFAULTS.COMPACTION_PRESERVE_RECENT).toBe(4);
  });

  test("STATUS_CODES exports all 10 status codes", () => {
    expect(STATUS_CODES.THINKING).toBe("thinking");
    expect(STATUS_CODES.PLANNING).toBe("planning");
    expect(STATUS_CODES.EXECUTING_TASKS).toBe("executing-tasks");
    expect(STATUS_CODES.SYNTHESIZING).toBe("synthesizing");
    expect(STATUS_CODES.COMPACTING).toBe("compacting");
    expect(STATUS_CODES.RETRYING).toBe("retrying");
    expect(STATUS_CODES.FALLBACK).toBe("fallback");
    expect(STATUS_CODES.GUARD_CHECK).toBe("guard-check");
    expect(STATUS_CODES.LOADING_CONTEXT).toBe("loading-context");
    expect(STATUS_CODES.PROCESSING).toBe("processing");
    expect(Object.keys(STATUS_CODES)).toHaveLength(10);
  });

  test("status event is wired in SSE_EVENTS, BUS_EVENTS, BUS_TO_SSE_MAP, FORWARDED_BUS_EVENTS", () => {
    expect(SSE_EVENTS.STATUS).toBe("status");
    expect(BUS_EVENTS.STATUS).toBe("status");
    expect(BUS_TO_SSE_MAP["status"]).toBe("status");
    expect(FORWARDED_BUS_EVENTS.has("status")).toBe(true);
  });

  test("cleanup", async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });
});
