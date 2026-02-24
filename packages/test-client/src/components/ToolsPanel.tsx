import { createSignal, For, Show, type Component } from "solid-js";
import { getJson, postJson } from "../lib/api";
import JsonView from "./shared/JsonView.tsx";

interface ToolInfo {
  name: string;
  description: string;
  category?: string;
}

interface QuickTest {
  label: string;
  tool: string;
  input: Record<string, unknown>;
}

const quickTests: QuickTest[] = [
  { label: 'Echo "Hello"', tool: "echo", input: { message: "Hello from test client!" } },
  { label: "Weather: Tokyo", tool: "getWeather", input: { location: "Tokyo" } },
  { label: "Weather: New York", tool: "getWeather", input: { location: "New York" } },
  { label: "Calc: 2+3*4", tool: "calculate", input: { expression: "2 + 3 * 4" } },
  { label: "Calc: sqrt(144)", tool: "calculate", input: { expression: "144 ** 0.5" } },
  { label: "Calc: (10^3)/7", tool: "calculate", input: { expression: "(10 ** 3) / 7" } },
];

const ToolsPanel: Component = () => {
  const [tools, setTools] = createSignal<ToolInfo[]>([]);
  const [result, setResult] = createSignal<unknown>(null);
  const [activeTest, setActiveTest] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  async function loadTools() {
    try {
      const data = await getJson<{ tools: ToolInfo[] }>("/api/tools");
      setTools(data.tools);
    } catch (e: any) {
      setError(e.message);
    }
  }

  loadTools();

  async function runQuickTest(test: QuickTest) {
    setLoading(true);
    setError("");
    setResult(null);
    setActiveTest(test.label);
    try {
      const data = await postJson(`/api/tools/${test.tool}`, test.input);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Tools</h2>

      <Show when={tools().length > 0}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">{tools().length} tools registered</p>
          <For each={tools()}>
            {(t) => (
              <div class="rounded bg-gray-900 px-3 py-2 text-sm border border-gray-800">
                <span class="font-medium text-blue-400">{t.name}</span>
                <span class="text-gray-500 ml-2">{t.description}</span>
                <Show when={t.category}>
                  <span class="ml-2 text-xs text-gray-600">({t.category})</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <div class="space-y-2">
        <p class="text-sm text-gray-400">Quick Tests</p>
        <div class="flex flex-wrap gap-2">
          <For each={quickTests}>
            {(test) => (
              <button
                class={`rounded px-3 py-2 text-sm font-medium border transition-colors ${
                  activeTest() === test.label
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                } disabled:opacity-50`}
                onClick={() => runQuickTest(test)}
                disabled={loading()}
              >
                {loading() && activeTest() === test.label ? "Running..." : test.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {error() && <p class="text-sm text-red-400">{error()}</p>}
      <Show when={result()}>
        <div class="space-y-1">
          <p class="text-sm text-gray-400">Result: {activeTest()}</p>
          <JsonView data={result()} />
        </div>
      </Show>
    </div>
  );
};

export default ToolsPanel;
