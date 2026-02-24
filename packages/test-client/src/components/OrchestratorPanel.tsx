import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postSse } from "../lib/api";
import { parseSseStream } from "../lib/sse-parser";
import EventLog, { type LogEntry } from "./shared/EventLog.tsx";
import RequestInfo from "./shared/RequestInfo.tsx";
import StatusBadge from "./shared/StatusBadge.tsx";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PlanTask {
  agent: string;
  query: string;
  skills?: string[];
}

interface QuickTest {
  label: string;
  message: string;
  planMode?: boolean;
  autonomous?: boolean;
}

const quickTests: QuickTest[] = [
  {
    label: "Simple route (autonomous)",
    message: "What's the weather in Tokyo?",
    autonomous: true,
  },
  {
    label: "Multi-agent (autonomous)",
    message: "Check the weather in London AND calculate 2^20",
    autonomous: true,
  },
  {
    label: "Plan mode (needs approval)",
    message: "Get weather for Paris, New York, and Sydney, then calculate the average of their temperatures",
    planMode: true,
    autonomous: false,
  },
  {
    label: "Non-autonomous (shows plan)",
    message: "Echo 'hello' and check weather in Berlin",
    autonomous: false,
  },
];

const OrchestratorPanel: Component = () => {
  const [conversationId, setConversationId] = createSignal<string | null>(null);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [currentText, setCurrentText] = createSignal("");
  const [streaming, setStreaming] = createSignal(false);
  const [pendingPlan, setPendingPlan] = createSignal<PlanTask[] | null>(null);
  const [events, setEvents] = createSignal<LogEntry[]>([]);
  const [statusText, setStatusText] = createSignal("");
  const [error, setError] = createSignal("");
  const [lastMessage, setLastMessage] = createSignal("");
  const [orchestratorSystem, setOrchestratorSystem] = createSignal("");

  // Fetch orchestrator system prompt
  getJson<{ systemPrompt: string }>("/api/agents/orchestrator")
    .then((data) => setOrchestratorSystem(data.systemPrompt))
    .catch(() => {});

  function resetChat() {
    setConversationId(null);
    setMessages([]);
    setEvents([]);
    setCurrentText("");
    setPendingPlan(null);
    setStatusText("");
    setLastMessage("");
  }

  async function send(body: Record<string, unknown>, userLabel?: string) {
    if (streaming()) return;

    if (userLabel) {
      setMessages((prev) => [...prev, { role: "user", content: userLabel }]);
    }

    setStreaming(true);
    setError("");
    setCurrentText("");
    setStatusText("");

    if (conversationId()) body.conversationId = conversationId();

    try {
      const res = await postSse("/api/agents/orchestrator", body);
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
        if (evt.event === "error" && parsed.error) {
          setError(parsed.error);
        }
        if (evt.event === "agent-plan" && parsed.tasks) {
          setPendingPlan(parsed.tasks);
        }
        if (evt.event === "done" && parsed.awaitingApproval && parsed.tasks) {
          setPendingPlan(parsed.tasks);
        }
      }

      if (fullText) {
        setMessages((prev) => [
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

  function runQuickTest(test: QuickTest) {
    setLastMessage(test.message);
    send(
      {
        message: test.message,
        planMode: test.planMode ?? false,
        autonomous: test.autonomous ?? true,
      },
      test.message,
    );
  }

  async function approvePlan() {
    const plan = pendingPlan();
    if (!plan) return;
    setPendingPlan(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "(Approved plan)" },
    ]);
    await send({
      message: lastMessage() || "Execute the approved plan",
      approvedPlan: plan,
      autonomous: true,
    });
  }

  function rejectPlan() {
    setPendingPlan(null);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "(Plan rejected by user)" },
    ]);
  }

  return (
    <div class="flex gap-4 h-[calc(100vh-10rem)]">
      <div class="flex flex-1 flex-col">
        <div class="mb-2 flex items-center gap-2">
          <span class="text-sm font-medium text-gray-300">Orchestrator</span>
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

        {/* Quick test buttons (shown when no messages) */}
        <Show when={messages().length === 0}>
          <div class="mb-3 space-y-2">
            <p class="text-sm text-gray-500">Click to test orchestrator behavior:</p>
            <div class="flex flex-wrap gap-2">
              <For each={quickTests}>
                {(test) => (
                  <button
                    class={`rounded px-3 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${
                      test.planMode
                        ? "bg-amber-900/50 border-amber-800 text-amber-300 hover:bg-amber-800/50"
                        : test.autonomous === false
                          ? "bg-purple-900/50 border-purple-800 text-purple-300 hover:bg-purple-800/50"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    }`}
                    onClick={() => runQuickTest(test)}
                    disabled={streaming()}
                  >
                    {test.label}
                  </button>
                )}
              </For>
            </div>
            <p class="text-xs text-gray-600">
              Gray = autonomous, Amber = plan mode (needs approval), Purple = non-autonomous (shows plan)
            </p>
          </div>
        </Show>

        <Show when={orchestratorSystem()}>
          <div class="mb-2">
            <RequestInfo
              agent="orchestrator"
              system={orchestratorSystem()}
            />
          </div>
        </Show>

        <div class="flex-1 overflow-auto space-y-2 rounded bg-gray-900 p-3 border border-gray-800">
          <For each={messages()}>
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

          <Show when={pendingPlan()}>
            <div class="rounded bg-amber-950 border border-amber-700 p-3 space-y-2">
              <p class="text-sm font-medium text-amber-300">
                Pending Plan ({pendingPlan()!.length} tasks)
              </p>
              <For each={pendingPlan()!}>
                {(task, i) => (
                  <div class="rounded bg-amber-900/50 px-3 py-2 text-sm">
                    <span class="text-amber-300 font-medium">
                      Task {i() + 1}:
                    </span>{" "}
                    <span class="text-amber-100">{task.agent}</span>
                    <p class="text-amber-200/80 mt-1">{task.query}</p>
                    <Show when={task.skills?.length}>
                      <p class="text-xs text-amber-400 mt-1">
                        Skills: {task.skills!.join(", ")}
                      </p>
                    </Show>
                  </div>
                )}
              </For>
              <div class="flex gap-2">
                <button
                  class="rounded bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500"
                  onClick={approvePlan}
                >
                  Approve & Execute
                </button>
                <button
                  class="rounded bg-red-700 px-4 py-2 text-sm font-medium hover:bg-red-600"
                  onClick={rejectPlan}
                >
                  Reject
                </button>
              </div>
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
      <div class="w-80 shrink-0">
        <p class="mb-2 text-sm text-gray-400">Event Log ({events().length})</p>
        <EventLog entries={events()} />
      </div>
    </div>
  );
};

export default OrchestratorPanel;
