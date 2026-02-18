import type { TerminalLineType } from "../types";

const typeColorMap: Record<TerminalLineType, string> = {
  text: "text-ansi-green",
  "tool-call": "text-ansi-yellow",
  "tool-result": "text-ansi-cyan",
  status: "text-ansi-magenta italic",
  done: "text-muted",
  error: "text-ansi-red",
  info: "text-muted",
  success: "text-ansi-green",
  warning: "text-ansi-yellow",
  "system-prompt": "text-ansi-magenta",
  "user-prompt": "text-ansi-cyan",
};

export function getLineColorClass(type: TerminalLineType): string {
  return typeColorMap[type] ?? "text-primary";
}

export function formatToolCall(toolName: string, args: unknown): string {
  const argsStr = JSON.stringify(args, null, 0);
  const truncated =
    argsStr.length > 120 ? argsStr.slice(0, 120) + "..." : argsStr;
  return `[tool] ${toolName}(${truncated})`;
}

export function formatToolResult(toolName: string, result: unknown): string {
  const resultStr = JSON.stringify(result, null, 2);
  const truncated =
    resultStr.length > 200 ? resultStr.slice(0, 200) + "..." : resultStr;
  return `[result] ${toolName} => ${truncated}`;
}

export function formatDoneStats(data: {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number | null;
    durationMs?: number;
  };
}): string {
  const u = data.usage;
  if (!u) return "Done.";
  const parts: string[] = [];
  if (u.totalTokens) parts.push(`${u.totalTokens} tokens`);
  if (u.durationMs) parts.push(`${(u.durationMs / 1000).toFixed(1)}s`);
  if (u.cost != null) parts.push(`$${u.cost.toFixed(6)}`);
  return parts.length > 0 ? parts.join(" | ") : "Done.";
}
