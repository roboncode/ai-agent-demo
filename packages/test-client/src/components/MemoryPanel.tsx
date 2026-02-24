import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postJson, deleteJson } from "../lib/api";
import JsonView from "./shared/JsonView.tsx";

interface MemoryEntry {
  key: string;
  value: unknown;
  context?: string;
}

interface QuickAction {
  label: string;
  action: () => Promise<void>;
  color?: string;
}

const MemoryPanel: Component = () => {
  const [entries, setEntries] = createSignal<MemoryEntry[]>([]);
  const [result, setResult] = createSignal<unknown>(null);
  const [activeAction, setActiveAction] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  async function run(label: string, fn: () => Promise<void>) {
    setLoading(true);
    setError("");
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

  async function listEntries() {
    const data = await getJson<{ entries: MemoryEntry[] }>("/api/memory/default");
    setEntries(data.entries);
    setResult(data);
  }

  const quickActions: QuickAction[] = [
    {
      label: "List All (default ns)",
      action: listEntries,
    },
    {
      label: 'Set "user-name" = "Alice"',
      action: async () => {
        const data = await postJson("/api/memory/default", {
          key: "user-name",
          value: "Alice",
          context: "Test user preference",
        });
        setResult(data);
        await listEntries();
      },
    },
    {
      label: 'Set "favorite-color" = "blue"',
      action: async () => {
        const data = await postJson("/api/memory/default", {
          key: "favorite-color",
          value: "blue",
        });
        setResult(data);
        await listEntries();
      },
    },
    {
      label: 'Set "settings" = {theme: "dark", lang: "en"}',
      action: async () => {
        const data = await postJson("/api/memory/default", {
          key: "settings",
          value: JSON.stringify({ theme: "dark", lang: "en" }),
          context: "User settings object",
        });
        setResult(data);
        await listEntries();
      },
    },
    {
      label: 'Get "user-name"',
      action: async () => {
        const data = await getJson("/api/memory/default/user-name");
        setResult(data);
      },
    },
    {
      label: 'Delete "user-name"',
      action: async () => {
        const data = await deleteJson("/api/memory/default/user-name");
        setResult(data);
        await listEntries();
      },
      color: "red",
    },
    {
      label: "List (test-ns)",
      action: async () => {
        const data = await getJson<{ entries: MemoryEntry[] }>("/api/memory/test-ns");
        setResult(data);
      },
    },
    {
      label: 'Set in test-ns: "count" = 42',
      action: async () => {
        const data = await postJson("/api/memory/test-ns", {
          key: "count",
          value: "42",
        });
        setResult(data);
      },
    },
  ];

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Memory</h2>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Quick Actions</p>
        <div class="flex flex-wrap gap-2">
          <For each={quickActions}>
            {(qa) => (
              <button
                class={`rounded px-3 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${
                  qa.color === "red"
                    ? "bg-red-900/50 border-red-800 text-red-300 hover:bg-red-800/50"
                    : activeAction() === qa.label
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => run(qa.label, qa.action)}
                disabled={loading()}
              >
                {loading() && activeAction() === qa.label ? "Running..." : qa.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={entries().length > 0}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">{entries().length} entries in "default"</p>
          <For each={entries()}>
            {(entry) => (
              <div class="flex items-center gap-2 rounded bg-gray-900 px-3 py-2 text-sm border border-gray-800">
                <span class="font-medium text-blue-400">{entry.key}</span>
                <span class="text-gray-500 truncate">
                  {JSON.stringify(entry.value)}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>

      {error() && <p class="text-sm text-red-400">{error()}</p>}
      <Show when={result()}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">Result: {activeAction()}</p>
          <JsonView data={result()} />
        </div>
      </Show>
    </div>
  );
};

export default MemoryPanel;
