import type { Component } from "solid-js";

interface Props {
  onRun: () => void;
  onClear: () => void;
  isRunning: boolean;
  hasOutput: boolean;
}

const RunButton: Component<Props> = (props) => {
  return (
    <div class="flex items-center gap-3">
      <button
        onClick={props.onRun}
        disabled={props.isRunning}
        class="btn-glow flex items-center gap-2 rounded-lg bg-accent px-5 py-2 font-mono text-xs font-bold text-root transition-all hover:bg-accent-bright disabled:opacity-40 disabled:shadow-none"
      >
        {props.isRunning && <span class="spinner" />}
        {props.isRunning ? "Running..." : "Run Demo"}
      </button>
      {props.hasOutput && !props.isRunning && (
        <button
          onClick={props.onClear}
          class="rounded-lg border border-border px-4 py-2 font-mono text-xs text-muted transition-all hover:border-border hover:text-secondary"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default RunButton;
