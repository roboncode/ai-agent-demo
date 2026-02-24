import { createSignal, lazy, Suspense, For, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

const panels = {
  Health: lazy(() => import("./components/HealthPanel.tsx")),
  Agents: lazy(() => import("./components/AgentsPanel.tsx")),
  Chat: lazy(() => import("./components/ChatPanel.tsx")),
  Tools: lazy(() => import("./components/ToolsPanel.tsx")),
  Memory: lazy(() => import("./components/MemoryPanel.tsx")),
  Skills: lazy(() => import("./components/SkillsPanel.tsx")),
  Conversations: lazy(() => import("./components/ConversationsPanel.tsx")),
  Generate: lazy(() => import("./components/GeneratePanel.tsx")),
  Orchestrator: lazy(() => import("./components/OrchestratorPanel.tsx")),
} as const;

type Tab = keyof typeof panels;
const tabs = Object.keys(panels) as Tab[];

const App: Component = () => {
  const [active, setActive] = createSignal<Tab>("Health");

  return (
    <div class="flex h-screen">
      {/* Sidebar */}
      <nav class="w-48 shrink-0 flex flex-col gap-1 bg-gray-900 p-3 border-r border-gray-800">
        <h1 class="mb-3 text-lg font-bold text-white">AI Plugin</h1>
        <For each={tabs}>
          {(tab) => (
            <button
              class={`rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                active() === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          )}
        </For>
      </nav>

      {/* Main content */}
      <main class="flex-1 overflow-auto p-6">
        <Suspense
          fallback={
            <p class="text-gray-500 text-sm">Loading panel...</p>
          }
        >
          <Dynamic component={panels[active()]} />
        </Suspense>
      </main>
    </div>
  );
};

export default App;
