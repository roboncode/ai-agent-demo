import { type Component, For, Show, createSignal, createEffect, onMount } from "solid-js";

import type { VisualProps, SseDemoConfig } from "../types";
import { useAudioRecorder } from "../lib/useAudioRecorder";
import { transcribeAudio, postJson } from "../lib/api";
interface Task {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  createdAt: string;
}

type MicStatus = "idle" | "recording" | "transcribing";

const COLUMNS: { key: Task["status"]; label: string; accent: string }[] = [
  { key: "todo", label: "To Do", accent: "border-t-blue-400/60" },
  { key: "in-progress", label: "In Progress", accent: "border-t-amber-400/60" },
  { key: "done", label: "Done", accent: "border-t-emerald-400/60" },
];

const KanbanVisual: Component<VisualProps> = (props) => {
  const { isRecording, error: recorderError, start, stop } = useAudioRecorder();
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [status, setStatus] = createSignal<MicStatus>("idle");
  const [error, setError] = createSignal<string | null>(null);

  async function refreshTasks() {
    try {
      const result = await postJson<{ tasks: Task[] }>("/api/tools/listTasks", {});
      setTasks(result.tasks);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }

  onMount(() => {
    refreshTasks();
  });

  // Refresh board when agent stream finishes
  let wasRunning = false;
  createEffect(() => {
    const running = props.isRunning ?? false;
    if (wasRunning && !running) {
      refreshTasks();
    }
    wasRunning = running;
  });

  async function handleMicDown() {
    if (status() !== "idle") return;
    try {
      setError(null);
      await start();
      setStatus("recording");
    } catch {
      setError(recorderError() ?? "Failed to start recording");
    }
  }

  async function handleMicUp() {
    if (!isRecording()) return;
    try {
      setStatus("transcribing");
      const blob = await stop();
      const result = await transcribeAudio(blob);
      const demo: SseDemoConfig = {
        type: "sse",
        endpoint: "/api/agents/taskboard",
        body: { message: result.text },
      };
      props.onRun?.(demo);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
      setStatus("idle");
    }
  }

  const isRec = () => status() === "recording";
  const isTranscribing = () => status() === "transcribing";
  const tasksFor = (s: Task["status"]) => tasks().filter((t) => t.status === s);

  return (
    <div class="flex h-full flex-col">
      {/* Kanban columns */}
      <div class="grid flex-1 grid-cols-3 gap-3 overflow-hidden">
        <For each={COLUMNS}>
          {(col) => (
            <div class={`flex flex-col border border-border-subtle border-t-2 ${col.accent} bg-raised/40`}>
              {/* Column header */}
              <div class="px-3 py-2.5">
                <span class="text-sm font-semibold tracking-wide text-primary uppercase">
                  {col.label}
                </span>
              </div>

              {/* Task list */}
              <div class="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2 terminal-scroll">
                <Show
                  when={tasksFor(col.key).length > 0}
                  fallback={
                    <div class="flex flex-1 items-center justify-center">
                      <span class="text-sm text-muted italic">No tasks</span>
                    </div>
                  }
                >
                  <For each={tasksFor(col.key)}>
                    {(task) => (
                      <div class="border border-border-subtle bg-slide px-3 py-2.5 text-base leading-snug text-primary shadow-sm shadow-black/20">
                        {task.title}
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Mic button — fixed overlay on bottom-right of terminal */}
      <button
        class={`fixed right-10 bottom-20 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
          isRec()
            ? "mic-recording border-red-400 bg-red-500/20 text-red-400"
            : isTranscribing()
              ? "border-orange-400/30 bg-orange-500/10 text-orange-400/50"
              : "border-orange-400/40 bg-orange-500/10 text-orange-400 hover:border-orange-400/60 hover:bg-orange-500/15"
        }`}
        onMouseDown={handleMicDown}
        onMouseUp={handleMicUp}
        onMouseLeave={() => { if (isRecording()) handleMicUp(); }}
        onTouchStart={(e) => { e.preventDefault(); handleMicDown(); }}
        onTouchEnd={(e) => { e.preventDefault(); handleMicUp(); }}
        disabled={isTranscribing()}
      >
        <Show
          when={isRec()}
          fallback={
            <Show
              when={isTranscribing()}
              fallback={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              }
            >
              <span class="spinner inline-block !h-5 !w-5 !border-orange-400/30 !border-t-orange-400" />
            </Show>
          }
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </Show>
      </button>
    </div>
  );
};

export default KanbanVisual;
