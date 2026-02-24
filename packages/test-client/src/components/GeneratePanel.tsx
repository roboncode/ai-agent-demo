import { createSignal, For, Show, type Component } from "solid-js";
import { postJson, postSse } from "../lib/api";
import { parseSseStream } from "../lib/sse-parser";
import EventLog, { type LogEntry } from "./shared/EventLog.tsx";
import JsonView from "./shared/JsonView.tsx";
import RequestInfo from "./shared/RequestInfo.tsx";

interface QuickGenerate {
  label: string;
  message: string;
  system?: string;
  tools?: string[];
  format: "sse" | "json";
  maxSteps?: number;
}

const quickTests: QuickGenerate[] = [
  {
    label: "Simple prompt (SSE)",
    message: "Explain what a REST API is in 2 sentences.",
    format: "sse",
  },
  {
    label: "With system prompt (SSE)",
    message: "What is TypeScript?",
    system: "You are a pirate. Answer everything in pirate speak.",
    format: "sse",
  },
  {
    label: "Weather tool (SSE)",
    message: "What's the weather in Sydney?",
    tools: ["getWeather"],
    format: "sse",
    maxSteps: 3,
  },
  {
    label: "Calculator tool (SSE)",
    message: "What is the square root of 1764?",
    tools: ["calculate"],
    format: "sse",
    maxSteps: 3,
  },
  {
    label: "All tools (SSE)",
    message: "Echo 'test', check weather in Oslo, and calculate 99*99",
    tools: ["echo", "getWeather", "calculate"],
    format: "sse",
    maxSteps: 5,
  },
  {
    label: "Simple prompt (JSON)",
    message: "Name 3 programming languages and one use case for each.",
    format: "json",
  },
  {
    label: "All tools (JSON)",
    message: "What's the weather in Rome and what is 365*24?",
    tools: ["getWeather", "calculate"],
    format: "json",
    maxSteps: 5,
  },
];

const GeneratePanel: Component = () => {
  const [response, setResponse] = createSignal("");
  const [jsonResult, setJsonResult] = createSignal<unknown>(null);
  const [events, setEvents] = createSignal<LogEntry[]>([]);
  const [activeTest, setActiveTest] = createSignal<QuickGenerate | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  async function runTest(test: QuickGenerate) {
    setLoading(true);
    setError("");
    setResponse("");
    setJsonResult(null);
    setEvents([]);
    setActiveTest(test);

    const body: Record<string, unknown> = {
      prompt: test.message,
      maxSteps: test.maxSteps ?? 5,
    };
    if (test.system) body.systemPrompt = test.system;
    if (test.tools?.length) body.tools = test.tools;

    try {
      if (test.format === "json") {
        const data = await postJson("/api/generate?format=json", body);
        setJsonResult(data);
      } else {
        const res = await postSse("/api/generate?format=sse", body);
        let fullText = "";
        for await (const evt of parseSseStream(res)) {
          const parsed = (() => {
            try { return JSON.parse(evt.data); }
            catch { return evt.data; }
          })();
          setEvents((prev) => [
            ...prev,
            { event: evt.event, data: parsed, timestamp: Date.now() },
          ]);
          if (evt.event === "text-delta" && parsed.text) {
            fullText += parsed.text;
            setResponse(fullText);
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Generate</h2>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Quick Tests</p>
        <div class="flex flex-wrap gap-2">
          <For each={quickTests}>
            {(test) => (
              <button
                class={`rounded px-3 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${
                  activeTest()?.label === test.label
                    ? "bg-blue-600 border-blue-500 text-white"
                    : test.format === "json"
                      ? "bg-amber-900/50 border-amber-800 text-amber-300 hover:bg-amber-800/50"
                      : test.tools?.length
                        ? "bg-purple-900/50 border-purple-800 text-purple-300 hover:bg-purple-800/50"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => runTest(test)}
                disabled={loading()}
              >
                {loading() && activeTest()?.label === test.label ? "Running..." : test.label}
              </button>
            )}
          </For>
        </div>
        <p class="text-xs text-gray-600">
          Gray = plain prompt, Purple = with tools, Amber = JSON format
        </p>
      </div>

      {error() && <p class="text-sm text-red-400">{error()}</p>}

      <Show when={activeTest()}>
        <RequestInfo
          format={activeTest()!.format}
          system={activeTest()!.system}
          prompt={activeTest()!.message}
          tools={activeTest()!.tools}
        />
      </Show>

      <Show when={response()}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">Response</p>
          <div class="rounded bg-gray-900 p-3 text-sm border border-gray-800 whitespace-pre-wrap">
            {response()}
          </div>
        </div>
      </Show>

      <Show when={jsonResult()}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">JSON Result</p>
          <JsonView data={jsonResult()} />
        </div>
      </Show>

      <Show when={events().length > 0}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">Event Log ({events().length})</p>
          <EventLog entries={events()} />
        </div>
      </Show>
    </div>
  );
};

export default GeneratePanel;
