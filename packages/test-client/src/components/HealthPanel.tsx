import { createSignal, Show, type Component } from "solid-js";
import { getJson } from "../lib/api";
import JsonView from "./shared/JsonView.tsx";

const HealthPanel: Component = () => {
  const [result, setResult] = createSignal<unknown>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  async function checkHealth() {
    setLoading(true);
    setError("");
    try {
      const data = await getJson("/api/health");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-run on mount
  checkHealth();

  return (
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Health Check</h2>
      <button
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        onClick={checkHealth}
        disabled={loading()}
      >
        {loading() ? "Checking..." : "Refresh"}
      </button>
      {error() && <p class="text-sm text-red-400">{error()}</p>}
      <Show when={result()}>
        <JsonView data={result()} />
      </Show>
    </div>
  );
};

export default HealthPanel;
