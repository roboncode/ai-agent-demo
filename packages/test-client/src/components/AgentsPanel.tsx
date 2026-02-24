import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postJson, postSse } from "../lib/api";
import { parseSseStream } from "../lib/sse-parser";
import EventLog, { type LogEntry } from "./shared/EventLog.tsx";
import JsonView from "./shared/JsonView.tsx";
import RequestInfo from "./shared/RequestInfo.tsx";

interface AgentInfo {
  name: string;
  description: string;
  toolNames: string[];
  defaultFormat: string;
  systemPrompt?: string;
}

interface QuickPrompt {
  label: string;
  agent: string;
  message: string;
  format: "sse" | "json";
}

const quickPrompts: QuickPrompt[] = [
  { label: "General: Echo test (SSE)", agent: "general", message: "Echo back: Hello from the test client!", format: "sse" },
  { label: "General: Weather Tokyo (SSE)", agent: "general", message: "What's the weather like in Tokyo right now?", format: "sse" },
  { label: "General: Calculate 15% tip on $84.50 (SSE)", agent: "general", message: "Calculate a 15% tip on a bill of $84.50", format: "sse" },
  { label: "General: Multi-tool (SSE)", agent: "general", message: "What's 72 * 1.15? Also, what's the weather in London?", format: "sse" },
  { label: "General: Echo test (JSON)", agent: "general", message: "Echo back: JSON mode test", format: "json" },
  { label: "Guarded: Allowed message", agent: "guarded", message: "Hello, this should work fine!", format: "sse" },
  { label: "Guarded: Blocked message", agent: "guarded", message: "This message contains blocked keyword", format: "sse" },
];

const AgentsPanel: Component = () => {
  const [agents, setAgents] = createSignal<AgentInfo[]>([]);
  const [response, setResponse] = createSignal("");
  const [jsonResult, setJsonResult] = createSignal<unknown>(null);
  const [events, setEvents] = createSignal<LogEntry[]>([]);
  const [activePrompt, setActivePrompt] = createSignal<QuickPrompt | null>(null);
  const [agentSystem, setAgentSystem] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  // Cache system prompts per agent
  const systemPromptCache = new Map<string, string>();

  async function loadAgents() {
    try {
      const data = await getJson<{ agents: AgentInfo[] }>("/api/agents");
      setAgents(data.agents);
    } catch (e: any) {
      setError(e.message);
    }
  }

  loadAgents();

  async function fetchSystemPrompt(agentName: string): Promise<string> {
    if (systemPromptCache.has(agentName)) return systemPromptCache.get(agentName)!;
    try {
      const data = await getJson<{ systemPrompt: string }>(`/api/agents/${agentName}`);
      systemPromptCache.set(agentName, data.systemPrompt);
      return data.systemPrompt;
    } catch {
      return "(could not load system prompt)";
    }
  }

  async function runPrompt(qp: QuickPrompt) {
    setLoading(true);
    setError("");
    setResponse("");
    setJsonResult(null);
    setEvents([]);
    setActivePrompt(qp);

    const system = await fetchSystemPrompt(qp.agent);
    setAgentSystem(system);

    try {
      if (qp.format === "json") {
        const data = await postJson(`/api/agents/${qp.agent}?format=json`, {
          message: qp.message,
        });
        setJsonResult(data);
      } else {
        const res = await postSse(`/api/agents/${qp.agent}`, {
          message: qp.message,
        });
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
      <h2 class="text-xl font-semibold">Agents</h2>

      <Show when={agents().length > 0}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">{agents().length} agents registered</p>
          <For each={agents()}>
            {(a) => (
              <div class="rounded bg-gray-900 px-3 py-2 text-sm border border-gray-800">
                <span class="font-medium text-blue-400">{a.name}</span>
                <span class="text-gray-500 ml-2">{a.description}</span>
                <span class="text-xs text-gray-600 ml-2">
                  [{a.toolNames.join(", ")}]
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Quick Prompts</p>
        <div class="flex flex-wrap gap-2">
          <For each={quickPrompts}>
            {(qp) => (
              <button
                class={`rounded px-3 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${
                  activePrompt()?.label === qp.label
                    ? "bg-blue-600 border-blue-500 text-white"
                    : qp.label.includes("Blocked")
                      ? "bg-red-900/50 border-red-800 text-red-300 hover:bg-red-800/50"
                      : qp.format === "json"
                        ? "bg-amber-900/50 border-amber-800 text-amber-300 hover:bg-amber-800/50"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => runPrompt(qp)}
                disabled={loading()}
              >
                {loading() && activePrompt()?.label === qp.label ? "Running..." : qp.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {error() && <p class="text-sm text-red-400">{error()}</p>}

      <Show when={activePrompt()}>
        <RequestInfo
          agent={activePrompt()!.agent}
          format={activePrompt()!.format}
          system={agentSystem()}
          prompt={activePrompt()!.message}
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
        <JsonView data={jsonResult()} />
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

export default AgentsPanel;
