import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postSse } from "../lib/api";
import { parseSseStream } from "../lib/sse-parser";
import EventLog, { type LogEntry } from "./shared/EventLog.tsx";
import RequestInfo from "./shared/RequestInfo.tsx";
import StatusBadge from "./shared/StatusBadge.tsx";

interface AgentInfo {
  name: string;
  description: string;
  isOrchestrator?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const agentStarters: Record<string, string[]> = {
  general: [
    "What's the weather in Paris?",
    "Calculate 2^10 - 1",
    "Echo: multi-turn test",
    "What's the weather in Tokyo and also calculate 100/7?",
  ],
  guarded: [
    "Hello, this is a normal message",
    "This message contains blocked keyword",
    "Tell me a joke",
  ],
};
const defaultStarters = ["Hello!", "What can you do?"];

const ChatPanel: Component = () => {
  const [agents, setAgents] = createSignal<AgentInfo[]>([]);
  const [selected, setSelected] = createSignal("general");
  const [conversationId, setConversationId] = createSignal<string | null>(null);
  const [chatMessages, setChatMessages] = createSignal<ChatMessage[]>([]);
  const [streaming, setStreaming] = createSignal(false);
  const [currentText, setCurrentText] = createSignal("");
  const [events, setEvents] = createSignal<LogEntry[]>([]);
  const [statusText, setStatusText] = createSignal("");
  const [error, setError] = createSignal("");
  const [agentSystem, setAgentSystem] = createSignal("");

  const chatAgents = () => agents().filter((a) => !a.isOrchestrator);

  const systemPromptCache = new Map<string, string>();

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

  async function loadAgents() {
    try {
      const data = await getJson<{ agents: AgentInfo[] }>("/api/agents");
      setAgents(data.agents);
    } catch (e: any) {
      setError(e.message);
    }
  }

  loadAgents();
  fetchSystemPrompt(selected()).then(setAgentSystem);

  function resetChat() {
    setConversationId(null);
    setChatMessages([]);
    setEvents([]);
    setCurrentText("");
    setStatusText("");
  }

  async function send(text: string) {
    if (!selected() || !text || streaming()) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setError("");
    setCurrentText("");
    setStatusText("");

    const body: Record<string, unknown> = { message: text };
    if (conversationId()) body.conversationId = conversationId();

    try {
      const res = await postSse(`/api/agents/${selected()}`, body);
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
        if (evt.event === "session-start" && parsed.conversationId) {
          setConversationId(parsed.conversationId);
        }
        if (evt.event === "text-delta" && parsed.text) {
          fullText += parsed.text;
          setCurrentText(fullText);
        }
        if (evt.event === "status" && parsed.message) {
          setStatusText(parsed.message);
        }
      }

      if (fullText) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullText },
        ]);
        setCurrentText("");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStreaming(false);
      setStatusText("");
    }
  }

  return (
    <div class="flex gap-4 h-[calc(100vh-10rem)]">
      {/* Chat area */}
      <div class="flex flex-1 flex-col">
        <div class="mb-2 flex items-center gap-2">
          <select
            class="rounded bg-gray-800 px-3 py-2 text-sm border border-gray-700"
            value={selected()}
            onChange={(e) => {
              setSelected(e.currentTarget.value);
              resetChat();
              fetchSystemPrompt(e.currentTarget.value).then(setAgentSystem);
            }}
          >
            <For each={chatAgents()}>
              {(a) => (
                <option value={a.name}>
                  {a.name} — {a.description}
                </option>
              )}
            </For>
          </select>
          <Show when={conversationId()}>
            <span class="text-xs font-mono text-gray-500">
              {conversationId()}
            </span>
          </Show>
          <button
            class="ml-auto rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
            onClick={resetChat}
          >
            New Chat
          </button>
        </div>

        {/* Starter prompts (shown when no messages) */}
        <Show when={chatMessages().length === 0}>
          <div class="mb-3 space-y-2">
            <p class="text-sm text-gray-500">Click to start a conversation:</p>
            <div class="flex flex-wrap gap-2">
              <For each={agentStarters[selected()] ?? defaultStarters}>
                {(prompt) => (
                  <button
                    class={`rounded px-3 py-2 text-sm border disabled:opacity-50 ${
                      prompt.toLowerCase().includes("blocked")
                        ? "bg-red-900/50 border-red-800 text-red-300 hover:bg-red-800/50"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    }`}
                    onClick={() => send(prompt)}
                    disabled={streaming()}
                  >
                    {prompt}
                  </button>
                )}
              </For>
            </div>
            <Show when={selected() === "guarded"}>
              <p class="text-xs text-gray-600">
                The guarded agent has a guard hook that blocks any message containing the word "blocked".
                Try the red button to see the guard reject the request.
              </p>
            </Show>
          </div>
        </Show>

        {/* Follow-up prompts (shown after first exchange) */}
        <Show when={chatMessages().length > 0 && !streaming()}>
          <div class="mb-2 flex flex-wrap gap-2">
            <button
              class="rounded px-2 py-1 text-xs border bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
              onClick={() => send("Tell me more about that")}
            >
              Tell me more
            </button>
            <button
              class="rounded px-2 py-1 text-xs border bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
              onClick={() => send("Can you also check the weather in Berlin?")}
            >
              Also check Berlin weather
            </button>
            <button
              class="rounded px-2 py-1 text-xs border bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
              onClick={() => send("Now calculate 2^16")}
            >
              Calculate 2^16
            </button>
          </div>
        </Show>

        <Show when={agentSystem()}>
          <div class="mb-2">
            <RequestInfo
              agent={selected()}
              system={agentSystem()}
            />
          </div>
        </Show>

        <div class="flex-1 overflow-auto space-y-2 rounded bg-gray-900 p-3 border border-gray-800">
          <For each={chatMessages()}>
            {(msg) => (
              <div
                class={`rounded px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-950 border border-blue-800 ml-12"
                    : "bg-gray-800 border border-gray-700 mr-12"
                }`}
              >
                <span class="text-xs text-gray-500 block mb-1">{msg.role}</span>
                <p class="whitespace-pre-wrap">{msg.content}</p>
              </div>
            )}
          </For>

          <Show when={currentText()}>
            <div class="rounded px-3 py-2 text-sm bg-gray-800 border border-gray-700 mr-12 animate-pulse">
              <span class="text-xs text-gray-500 block mb-1">assistant</span>
              <p class="whitespace-pre-wrap">{currentText()}</p>
            </div>
          </Show>

          <Show when={statusText()}>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <StatusBadge event="status" />
              {statusText()}
            </div>
          </Show>
        </div>

        {error() && <p class="mt-1 text-sm text-red-400">{error()}</p>}
      </div>

      {/* Event log sidebar */}
      <div class="w-[40rem] shrink-0">
        <p class="mb-2 text-sm text-gray-400">Event Log ({events().length})</p>
        <EventLog entries={events()} />
      </div>
    </div>
  );
};

export default ChatPanel;
