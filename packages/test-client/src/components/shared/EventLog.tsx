import { For, type Component } from "solid-js";
import StatusBadge from "./StatusBadge.tsx";

export interface LogEntry {
  event: string;
  data: unknown;
  timestamp: number;
}

const EventLog: Component<{ entries: LogEntry[] }> = (props) => {
  return (
    <div class="flex flex-col gap-1 overflow-auto max-h-[600px]">
      <For each={props.entries}>
        {(entry) => (
          <div class="flex items-start gap-2 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-mono">
            <StatusBadge event={entry.event} />
            <span class="shrink-0 text-gray-500">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span class="min-w-0 truncate text-gray-400">
              {typeof entry.data === "string"
                ? entry.data
                : JSON.stringify(entry.data)}
            </span>
          </div>
        )}
      </For>
    </div>
  );
};

export default EventLog;
