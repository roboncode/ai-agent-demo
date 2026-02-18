import type { LanguageModel } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../env.js";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export const getModel = (id?: string): LanguageModel => openrouter(id ?? env.DEFAULT_MODEL);

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
  durationMs: number;
}

/**
 * Extract usage, cost, and timing from an AI SDK v6 result.
 * - Prefers `totalUsage` (aggregated across steps) over `usage` (last step only)
 * - Extracts cost from each step's `usage.raw.cost` (OpenRouter-specific)
 * - Requires `startTime` from `performance.now()` to compute duration
 */
export function extractUsage(
  result: { totalUsage?: any; usage?: any; steps?: any[] },
  startTime: number,
): UsageInfo {
  const u = result.totalUsage ?? result.usage;
  const inputTokens = u?.inputTokens ?? 0;
  const outputTokens = u?.outputTokens ?? 0;
  const totalTokens = u?.totalTokens ?? (inputTokens + outputTokens);
  const durationMs = Math.round(performance.now() - startTime);

  // Extract cost: sum raw cost from each step (OpenRouter includes it in usage.raw.cost)
  let cost: number | null = null;
  if (result.steps && result.steps.length > 0) {
    let total = 0;
    let found = false;
    for (const step of result.steps) {
      const stepCost = step.usage?.raw?.cost;
      if (typeof stepCost === "number") {
        total += stepCost;
        found = true;
      }
    }
    if (found) cost = total;
  } else {
    // Single-step fallback
    const rawCost = u?.raw?.cost;
    if (typeof rawCost === "number") cost = rawCost;
  }

  return { inputTokens, outputTokens, totalTokens, cost, durationMs };
}

/**
 * Merge multiple UsageInfo objects into one (for task agent aggregation).
 */
export function mergeUsage(...usages: UsageInfo[]): UsageInfo {
  const merged: UsageInfo = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cost: null,
    durationMs: 0,
  };

  for (const u of usages) {
    merged.inputTokens += u.inputTokens;
    merged.outputTokens += u.outputTokens;
    merged.totalTokens += u.totalTokens;
    if (u.cost !== null) {
      merged.cost = (merged.cost ?? 0) + u.cost;
    }
    if (u.durationMs > merged.durationMs) {
      merged.durationMs = u.durationMs; // wall-clock: take the max
    }
  }

  return merged;
}
