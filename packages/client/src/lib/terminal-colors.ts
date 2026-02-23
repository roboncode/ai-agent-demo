import type { TerminalLineType } from "../types";

const typeColorMap: Record<TerminalLineType, string> = {
  text: "text-ansi-green",
  "tool-call": "text-ansi-yellow",
  "tool-result": "text-ansi-cyan",
  status: "text-ansi-magenta italic",
  done: "text-primary",
  error: "text-ansi-red",
  info: "text-muted",
  success: "text-ansi-green",
  warning: "text-ansi-yellow",
  "system-prompt": "text-ansi-magenta",
  "user-prompt": "text-ansi-cyan",
  "og-card": "",
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

export function formatClassification(data: {
  allowed: boolean;
  category: string;
  reason: string;
}): Array<{ type: TerminalLineType; content: string }> {
  const lines: Array<{ type: TerminalLineType; content: string }> = [];
  const icon = data.allowed ? "PASS" : "BLOCKED";
  const statusType: TerminalLineType = data.allowed ? "success" : "error";

  lines.push({
    type: statusType,
    content: `  ${icon} — ${data.category}`,
  });
  lines.push({
    type: "info",
    content: `  Reason: ${data.reason}`,
  });
  lines.push({ type: "info", content: "" });

  return lines;
}

export function formatProposal(data: {
  actions: Array<{ id: string; action: string; parameters: Record<string, unknown> }>;
}): Array<{ type: TerminalLineType; content: string }> {
  const lines: Array<{ type: TerminalLineType; content: string }> = [];

  lines.push({ type: "info", content: "  Proposed actions:" });
  lines.push({ type: "info", content: "" });

  for (const action of data.actions) {
    lines.push({
      type: "warning",
      content: `  ACTION — ${action.action}`,
    });
    for (const [key, value] of Object.entries(action.parameters)) {
      lines.push({
        type: "info",
        content: `    ${key}: ${String(value)}`,
      });
    }
    lines.push({ type: "info", content: "" });
  }

  return lines;
}

export function formatApprovalResult(data: {
  id: string;
  action: string;
  status: string;
  result: { executed: boolean; message: string };
}): Array<{ type: TerminalLineType; content: string }> {
  const lines: Array<{ type: TerminalLineType; content: string }> = [];
  const isApproved = data.status === "approved";

  lines.push({
    type: isApproved ? "success" : "error",
    content: `  ${isApproved ? "APPROVED" : "REJECTED"} — ${data.action}`,
  });
  lines.push({
    type: "info",
    content: `  ${data.result.message}`,
  });

  return lines;
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
