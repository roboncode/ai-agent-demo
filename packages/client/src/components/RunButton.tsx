import type { Component } from "solid-js";

interface Props {
  onRun: () => void;
  onClear: () => void;
  isRunning: boolean;
  hasOutput: boolean;
}

const RunButton: Component<Props> = (props) => {
  return (
    <div class="flex items-center gap-2">
      <button
        onClick={props.onRun}
        disabled={props.isRunning}
        class="rounded-md bg-accent px-4 py-1.5 font-mono text-xs font-bold text-root transition-colors hover:bg-accent-dim disabled:opacity-40"
      >
        {props.isRunning ? "Running..." : "Run"}
      </button>
      {props.hasOutput && !props.isRunning && (
        <button
          onClick={props.onClear}
          class="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:text-primary"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default RunButton;
