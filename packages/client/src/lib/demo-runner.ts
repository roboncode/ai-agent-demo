import type { DemoConfig, TerminalLine } from "../types";
import { postJson, postSse, getStreamMode, deleteJson } from "./api";
import { parseSseStream, type SseEvent } from "./sse-parser";
import { wsStream } from "./ws-stream";
import {
  formatToolCall,
  formatToolResult,
  formatDoneStats,
  formatClassification,
  formatProposal,
  formatApprovalResult,
} from "./terminal-colors";

interface DemoCallbacks {
  addLine: (type: TerminalLine["type"], content: string) => void;
  setStreamingText: (text: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setAwaitingApproval: (actionId: string | null) => void;
}

export async function runDemo(
  demo: DemoConfig,
  cb: DemoCallbacks,
): Promise<void> {
  try {
    switch (demo.type) {
      case "json":
        await runJsonDemo(demo, cb);
        break;
      case "sse":
        await runSseDemo(demo, cb);
        break;
      case "multi-step":
        await runMultiStepDemo(demo, cb);
        break;
      case "delete":
        await runDeleteDemo(demo, cb);
        break;
      case "simulate-stream":
        await runSimulateStreamDemo(demo, cb);
        break;
    }
  } catch (err: any) {
    cb.setIsStreaming(false);
    cb.addLine("error", `Error: ${err.message}`);
    if (err.data) {
      cb.addLine("error", JSON.stringify(err.data, null, 2));
    }
  }
}

function emitPromptContext(
  systemPrompt: string | undefined,
  userPrompt: string | undefined,
  cb: Pick<DemoCallbacks, "addLine">,
): void {
  if (systemPrompt) {
    cb.addLine("system-prompt", `System Prompt:\n${systemPrompt}`);
    cb.addLine("info", "");
  }
  if (userPrompt) {
    cb.addLine("user-prompt", `User Prompt:\n${userPrompt}`);
    cb.addLine("info", "");
  }
}

async function runJsonDemo(
  demo: Extract<DemoConfig, { type: "json" }>,
  cb: DemoCallbacks,
): Promise<void> {
  const userPrompt = String(demo.body.prompt ?? demo.body.message ?? "");
  emitPromptContext(demo.systemPrompt, userPrompt || undefined, cb);

  if (demo.steps) {
    // Multi-step JSON demo (e.g. auth with different keys)
    for (const step of demo.steps) {
      cb.addLine("info", `-- ${step.label} --`);

      try {
        const result = await postJson(demo.endpoint, step.body, {
          headers: step.headers,
          skipAuth: step.skipAuth,
        });
        cb.addLine("success", JSON.stringify(result, null, 2));
      } catch (err: any) {
        cb.addLine("error", JSON.stringify(err.data ?? { error: err.message }, null, 2));
      }

      cb.addLine("info", "");
    }
  } else {
    cb.addLine("info", `POST ${demo.endpoint}`);
    cb.addLine("info", "");

    const result = await postJson<Record<string, any>>(demo.endpoint, demo.body);

    if (demo.displayAs === "text" && typeof result.text === "string") {
      cb.addLine("text", result.text);
      cb.addLine("info", "");
      cb.addLine("done", formatDoneStats({ usage: result.usage }));
    } else {
      cb.addLine("success", JSON.stringify(result, null, 2));
    }
  }
}

async function runSseDemo(
  demo: Extract<DemoConfig, { type: "sse" }>,
  cb: DemoCallbacks,
): Promise<void> {
  if (demo.steps) {
    // Multi-step SSE: run each step sequentially
    emitPromptContext(demo.systemPrompt, undefined, cb);
    for (const step of demo.steps) {
      cb.addLine("info", `-- ${step.label} --`);
      cb.addLine("info", "");
      const stepUserPrompt = String(step.body.message ?? step.body.prompt ?? "");
      if (stepUserPrompt) {
        cb.addLine("user-prompt", `User Prompt:\n${stepUserPrompt}`);
        cb.addLine("info", "");
      }
      await runSingleSseStream(demo.endpoint, step.body, cb);
      cb.addLine("info", "");
    }
  } else {
    const userPrompt = String(demo.body.message ?? demo.body.prompt ?? "");
    emitPromptContext(demo.systemPrompt, userPrompt || undefined, cb);
    await runSingleSseStream(demo.endpoint, demo.body, cb);
  }
}

async function getEventStream(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<AsyncGenerator<SseEvent>> {
  if (getStreamMode() === "ws") {
    try {
      const gen = wsStream(endpoint, body);
      // Pull the first event to verify the connection actually works
      const first = await gen.next();
      if (first.done) throw new Error("empty");
      // Re-wrap: yield the buffered first event, then delegate the rest
      return (async function* () {
        yield first.value;
        yield* gen;
      })();
    } catch {
      // WS failed (VPN / proxy blocked it) — fall back to SSE for this request
      const response = await postSse(endpoint, body);
      return (async function* () {
        yield {
          event: "status",
          data: JSON.stringify({ phase: "WS unavailable — falling back to SSE" }),
        };
        yield* parseSseStream(response);
      })();
    }
  }
  const response = await postSse(endpoint, body);
  return parseSseStream(response);
}

async function runSingleSseStream(
  endpoint: string,
  body: Record<string, unknown>,
  cb: DemoCallbacks,
): Promise<void> {
  cb.addLine("info", `POST ${endpoint}`);
  cb.addLine("info", "--- stream starts ---");
  cb.addLine("info", "");

  cb.setIsStreaming(true);
  let streamBuffer = "";

  const events = await getEventStream(endpoint, body);

  for await (const event of events) {
    const data = JSON.parse(event.data);

    switch (event.event) {
      case "text-delta": {
        streamBuffer += data.text ?? "";
        cb.setStreamingText(streamBuffer);
        break;
      }
      case "tool-call": {
        if (streamBuffer) {
          cb.addLine("text", streamBuffer);
          streamBuffer = "";
          cb.setStreamingText("");
        }
        cb.addLine("tool-call", formatToolCall(data.toolName, data.args));
        break;
      }
      case "tool-result": {
        cb.addLine("tool-result", formatToolResult(data.toolName, data.result));
        break;
      }
      case "classification": {
        if (streamBuffer) {
          cb.addLine("text", streamBuffer);
          streamBuffer = "";
          cb.setStreamingText("");
        }
        for (const line of formatClassification(data)) {
          cb.addLine(line.type, line.content);
        }
        break;
      }
      case "status": {
        if (streamBuffer) {
          cb.addLine("text", streamBuffer);
          streamBuffer = "";
          cb.setStreamingText("");
        }
        cb.addLine("status", `-- ${data.phase} --`);
        break;
      }
      case "done": {
        if (streamBuffer) {
          cb.addLine("text", streamBuffer);
          streamBuffer = "";
          cb.setStreamingText("");
        }
        cb.addLine("info", "");
        cb.addLine("done", formatDoneStats(data));
        break;
      }
    }
  }

  cb.setIsStreaming(false);
  cb.addLine("info", "--- stream ends ---");
}

async function runMultiStepDemo(
  demo: Extract<DemoConfig, { type: "multi-step" }>,
  cb: DemoCallbacks,
): Promise<void> {
  const userPrompt = String(demo.proposeBody.message ?? demo.proposeBody.prompt ?? "");
  emitPromptContext(demo.systemPrompt, userPrompt || undefined, cb);

  cb.addLine("info", `POST ${demo.proposeEndpoint}`);
  cb.addLine("info", "--- stream starts ---");
  cb.addLine("info", "");

  cb.setIsStreaming(true);
  let actionId: string | null = null;

  const events = await getEventStream(demo.proposeEndpoint, demo.proposeBody);

  for await (const event of events) {
    const data = JSON.parse(event.data);

    switch (event.event) {
      case "status": {
        cb.addLine("status", `-- ${data.phase} --`);
        break;
      }
      case "tool-call": {
        cb.addLine("tool-call", formatToolCall(data.toolName, data.args));
        break;
      }
      case "proposal": {
        for (const line of formatProposal(data)) {
          cb.addLine(line.type, line.content);
        }
        if (data.actions?.[0]?.id) {
          actionId = data.actions[0].id;
        }
        break;
      }
      case "done": {
        cb.addLine("info", "");
        cb.addLine("done", formatDoneStats(data));
        break;
      }
    }
  }

  cb.setIsStreaming(false);
  cb.addLine("info", "--- stream ends ---");

  if (!actionId) {
    cb.addLine("error", "No action ID found in response");
    return;
  }

  cb.addLine("info", "");
  cb.addLine("info", "Awaiting human approval...");

  // Signal the UI to show approval buttons
  cb.setAwaitingApproval(actionId);
}

export async function runApproval(
  endpoint: string,
  actionId: string,
  approved: boolean,
  cb: Pick<DemoCallbacks, "addLine">,
): Promise<void> {
  cb.addLine("info", "");
  cb.addLine("status", `-- ${approved ? "approving" : "rejecting"} action --`);
  cb.addLine("info", `POST ${endpoint}`);
  cb.addLine("info", "");

  try {
    const result = await postJson<Record<string, any>>(endpoint, {
      id: actionId,
      approved,
    });
    for (const line of formatApprovalResult(result as any)) {
      cb.addLine(line.type, line.content);
    }
  } catch (err: any) {
    cb.addLine("error", JSON.stringify(err.data ?? { error: err.message }, null, 2));
  }
}

async function runDeleteDemo(
  demo: Extract<DemoConfig, { type: "delete" }>,
  cb: Pick<DemoCallbacks, "addLine">,
): Promise<void> {
  cb.addLine("info", `DELETE ${demo.endpoint}`);
  cb.addLine("info", "");

  try {
    const result = await deleteJson<Record<string, any>>(demo.endpoint);
    cb.addLine("success", JSON.stringify(result, null, 2));
  } catch (err: any) {
    cb.addLine("error", JSON.stringify(err.data ?? { error: err.message }, null, 2));
  }
}

async function runSimulateStreamDemo(
  demo: Extract<DemoConfig, { type: "simulate-stream" }>,
  cb: DemoCallbacks,
): Promise<void> {
  emitPromptContext(demo.systemPrompt, demo.userPrompt, cb);

  cb.addLine("info", "POST /api/generate/stream  (simulated)");
  cb.addLine("info", "--- stream starts ---");
  cb.addLine("info", "");

  cb.setIsStreaming(true);

  const words = demo.text.split(/(\s+)/); // keep whitespace as separate tokens
  const delay = demo.delayMs ?? 60;
  let buffer = "";

  for (const word of words) {
    buffer += word;
    cb.setStreamingText(buffer);
    // only delay on actual words, not whitespace-only tokens
    if (word.trim()) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Flush the buffer as a finished text line
  cb.addLine("text", buffer);
  cb.setStreamingText("");
  cb.setIsStreaming(false);

  cb.addLine("info", "");
  cb.addLine("done", formatDoneStats({
    usage: { inputTokens: 24, outputTokens: words.filter((w) => w.trim()).length, totalTokens: 24 + words.filter((w) => w.trim()).length },
  }));
  cb.addLine("info", "--- stream ends ---");
}
