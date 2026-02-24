import { For, type Component } from "solid-js";
import StatusBadge from "./StatusBadge.tsx";

export interface LogEntry {
  event: string;
  data: unknown;
  timestamp: number;
}

const EventLog: Component<{ entries: LogEntry[] }> = (props) => {
  return (
    <div class="flex flex-col gap-1 overflow-auto max-h-[1200px]">
      <For each={props.entries}>
        {(entry) => (
          <div class="flex items-start gap-2 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-mono">
            <StatusBadge event={entry.event} />
            <span class="shrink-0 text-gray-500">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <pre class="min-w-0 whitespace-pre-wrap break-all text-gray-400 m-0">
              {typeof entry.data === "string"
                ? entry.data
                : JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        )}
      </For>
    </div>
  );
};

export default EventLog;
