import type { Component } from "solid-js";

const colorMap: Record<string, string> = {
  "text-delta": "bg-green-900 text-green-300",
  "tool-call": "bg-blue-900 text-blue-300",
  "tool-result": "bg-cyan-900 text-cyan-300",
  "agent-start": "bg-purple-900 text-purple-300",
  "agent-end": "bg-purple-900 text-purple-300",
  "agent-think": "bg-indigo-900 text-indigo-300",
  "agent-plan": "bg-amber-900 text-amber-300",
  status: "bg-yellow-900 text-yellow-300",
  "session-start": "bg-gray-700 text-gray-300",
  done: "bg-gray-700 text-gray-300",
  error: "bg-red-900 text-red-300",
  cancelled: "bg-red-900 text-red-300",
  "skill-inject": "bg-pink-900 text-pink-300",
  "ask-user": "bg-orange-900 text-orange-300",
};

const StatusBadge: Component<{ event: string }> = (props) => {
  const cls = () => colorMap[props.event] ?? "bg-gray-800 text-gray-400";

  return (
    <span
      class={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls()}`}
    >
      {props.event}
    </span>
  );
};

export default StatusBadge;
