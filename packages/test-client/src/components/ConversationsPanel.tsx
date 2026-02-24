import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postJson, deleteJson } from "../lib/api";
import JsonView from "./shared/JsonView.tsx";

interface ConversationSummary {
  id: string;
  messageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

const ConversationsPanel: Component = () => {
  const [conversations, setConversations] = createSignal<ConversationSummary[]>([]);
  const [messages, setMessages] = createSignal<unknown[]>([]);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [result, setResult] = createSignal<unknown>(null);
  const [activeAction, setActiveAction] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [statusMsg, setStatusMsg] = createSignal("");

  async function run(label: string, fn: () => Promise<void>) {
    setLoading(true);
    setError("");
    setStatusMsg("");
    setResult(null);
    setActiveAction(label);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function listConversations() {
    const data = await getJson<{ conversations: ConversationSummary[] }>("/api/conversations");
    setConversations(data.conversations);
    setResult(data);
  }

  listConversations();

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Conversations</h2>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Quick Actions</p>
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded px-3 py-2 text-sm font-medium border bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            onClick={() => run("List all", listConversations)}
            disabled={loading()}
          >
            Refresh List
          </button>
          <button
            class="rounded px-3 py-2 text-sm font-medium border bg-green-900/50 border-green-800 text-green-300 hover:bg-green-800/50 disabled:opacity-50"
            onClick={() =>
              run("Create conversation", async () => {
                const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const data = await postJson("/api/conversations", { id });
                setResult(data);
                setStatusMsg(`Created conversation ${id}`);
                await listConversations();
              })
            }
            disabled={loading()}
          >
            Create New
          </button>
          <button
            class="rounded px-3 py-2 text-sm font-medium border bg-green-900/50 border-green-800 text-green-300 hover:bg-green-800/50 disabled:opacity-50"
            onClick={() =>
              run("Create with custom ID", async () => {
                const data = await postJson("/api/conversations", {
                  id: `test-conv-${Date.now()}`,
                });
                setResult(data);
                setStatusMsg("Created conversation with custom ID");
                await listConversations();
              })
            }
            disabled={loading()}
          >
            Create with Custom ID
          </button>
        </div>
      </div>

      <Show when={conversations().length > 0}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">{conversations().length} conversation(s)</p>
          <For each={conversations()}>
            {(conv) => (
              <div class="flex items-center gap-2 rounded bg-gray-900 px-3 py-2 text-sm border border-gray-800">
                <span class="font-mono text-blue-400 text-xs">{conv.id}</span>
                <span class="text-gray-500">{conv.messageCount} msgs</span>
                <span class="flex-1" />
                <button
                  class="rounded px-2 py-1 text-xs bg-blue-900/50 border border-blue-800 text-blue-300 hover:bg-blue-800/50"
                  onClick={() =>
                    run(`View ${conv.id}`, async () => {
                      setSelected(conv.id);
                      const data = await getJson<{ messages: unknown[] }>(
                        `/api/conversations/${conv.id}`,
                      );
                      setMessages(data.messages);
                      setResult(data);
                    })
                  }
                >
                  View
                </button>
                <button
                  class="rounded px-2 py-1 text-xs bg-amber-900/50 border border-amber-800 text-amber-300 hover:bg-amber-800/50"
                  onClick={() =>
                    run(`Compact ${conv.id}`, async () => {
                      const data = await postJson(
                        `/api/conversations/${conv.id}/compact`,
                        { preserveRecent: 4 },
                      );
                      setResult(data);
                      setStatusMsg(`Compacted ${conv.id}`);
                    })
                  }
                >
                  Compact
                </button>
                <button
                  class="rounded px-2 py-1 text-xs bg-red-900/50 border border-red-800 text-red-300 hover:bg-red-800/50"
                  onClick={() =>
                    run(`Delete ${conv.id}`, async () => {
                      await deleteJson(`/api/conversations/${conv.id}`);
                      setStatusMsg(`Deleted ${conv.id}`);
                      if (selected() === conv.id) {
                        setSelected(null);
                        setMessages([]);
                      }
                      await listConversations();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={selected() && messages().length > 0}>
        <div class="space-y-2">
          <p class="text-sm font-medium text-gray-300">
            Messages in: {selected()}
          </p>
          <div class="max-h-80 overflow-auto space-y-1">
            <For each={messages()}>
              {(msg: any) => (
                <div
                  class={`rounded px-3 py-2 text-sm border ${
                    msg.role === "user"
                      ? "bg-blue-950 border-blue-800"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <span class="font-medium text-xs text-gray-400">
                    {msg.role}
                  </span>
                  <p class="mt-1 text-gray-300 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {error() && <p class="text-sm text-red-400">{error()}</p>}
      {statusMsg() && <p class="text-sm text-green-400">{statusMsg()}</p>}
      <Show when={result()}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">Result: {activeAction()}</p>
          <JsonView data={result()} />
        </div>
      </Show>
    </div>
  );
};

export default ConversationsPanel;
