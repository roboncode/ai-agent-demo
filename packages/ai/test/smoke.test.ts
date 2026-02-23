/**
 * Smoke test for @jombee/ai plugin.
 * Run with: bun test packages/ai/test/smoke.test.ts
 */
import { describe, test, expect } from "bun:test";
import { createAIPlugin, createFileStorage, makeRegistryHandlers, SSE_EVENTS, BUS_EVENTS, TOOL_NAMES, DEFAULTS, CardRegistry, DEFAULT_ORCHESTRATOR_PROMPT } from "../src/index.js";
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
    expect(TOOL_NAMES.CLARIFY).toBe("_clarify");
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

  test("cleanup", async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });
});
