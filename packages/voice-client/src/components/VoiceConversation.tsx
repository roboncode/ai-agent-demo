import { createSignal, createEffect, For, Show, onMount, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { useAudioRecorder } from "../lib/useAudioRecorder";
import { useAudioPlayer } from "../lib/useAudioPlayer";
import {
  transcribe,
  speak,
  getSpeakers,
  streamSupervisor,
  type Speaker,
  type SseEvent,
} from "../lib/api";

type Status = "idle" | "recording" | "transcribing" | "reviewing" | "streaming" | "speaking";

interface ActivityEvent {
  type:
    | "agent-start"
    | "agent-end"
    | "delegate-start"
    | "delegate-end"
    | "tool-call"
    | "tool-result"
    | "agent-think"
    | "agent-plan";
  label: string;
  detail?: string;
}

interface Exchange {
  id: number;
  userText: string;
  agentText: string;
  activityLog: ActivityEvent[];
  isComplete: boolean;
  usage?: { totalTokens?: number };
  timestamp: Date;
}

export default function VoiceConversation() {
  const recorder = useAudioRecorder();
  const player = useAudioPlayer();

  const [status, setStatus] = createSignal<Status>("idle");
  const [store, setStore] = createStore<{ exchanges: Exchange[] }>({ exchanges: [] });
  const [speakers, setSpeakers] = createSignal<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = createSignal("alloy");
  const [conversationId, setConversationId] = createSignal<string | undefined>();
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);
  const [showSettings, setShowSettings] = createSignal(false);
  const [reviewText, setReviewText] = createSignal("");

  let scrollRef: HTMLDivElement | undefined;
  let nextId = 1;

  onMount(async () => {
    try {
      const s = await getSpeakers();
      setSpeakers(s);
    } catch {
      // Voice might not be configured
    }
  });

  // ---------- Spacebar push-to-talk ----------

  function isInputFocused(): boolean {
    const tag = document.activeElement?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code !== "Space" || e.repeat || isInputFocused()) return;
    if (status() !== "idle") return;
    e.preventDefault();
    handleMicDown();
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code !== "Space" || isInputFocused()) return;
    if (status() !== "recording") return;
    e.preventDefault();
    handleMicUp();
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  });

  // Auto-scroll conversation history
  createEffect(() => {
    if (store.exchanges.length && scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  });

  // Find index of exchange by id
  function findIdx(exchangeId: number): number {
    return store.exchanges.findIndex((ex) => ex.id === exchangeId);
  }

  // ---------- Push-to-talk handlers ----------

  async function handleMicDown() {
    setErrorMsg(null);
    try {
      await recorder.start();
      setStatus("recording");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setErrorMsg(msg);
    }
  }

  async function handleMicUp() {
    if (!recorder.isRecording()) return;
    try {
      const audioBlob = await recorder.stop();
      setStatus("transcribing");

      const result = await transcribe(audioBlob);
      setReviewText(result.text);
      setStatus("reviewing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      setErrorMsg(msg);
      setStatus("idle");
    }
  }

  function handleCancelReview() {
    setReviewText("");
    setStatus("idle");
  }

  // ---------- SSE streaming handler ----------

  async function handleSend() {
    const text = reviewText().trim();
    if (!text) return;

    setReviewText("");
    setStatus("streaming");

    const exchangeId = nextId++;
    // Append new exchange at end of store array
    setStore("exchanges", store.exchanges.length, {
      id: exchangeId,
      userText: text,
      agentText: "",
      activityLog: [],
      isComplete: false,
      timestamp: new Date(),
    });

    try {
      for await (const event of streamSupervisor(text, {
        conversationId: conversationId(),
      })) {
        processEvent(exchangeId, event);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stream failed";
      setErrorMsg(msg);
    }

    // Mark complete
    const idx = findIdx(exchangeId);
    if (idx !== -1) setStore("exchanges", idx, "isComplete", true);
    setStatus("idle");
  }

  function processEvent(exchangeId: number, event: SseEvent) {
    const idx = findIdx(exchangeId);
    if (idx === -1) return;

    switch (event.event) {
      case "text-delta": {
        const text = tryParseJson(event.data)?.text ?? event.data;
        setStore("exchanges", idx, "agentText", (prev) => prev + text);
        // Auto-scroll
        if (scrollRef) scrollRef.scrollTop = scrollRef.scrollHeight;
        break;
      }

      case "agent:start": {
        const d = tryParseJson(event.data);
        const label = d?.agent ? `Agent started: ${d.agent}` : "Agent started";
        pushActivity(idx, { type: "agent-start", label });
        break;
      }

      case "agent:end": {
        const d = tryParseJson(event.data);
        const label = d?.agent ? `Agent finished: ${d.agent}` : "Agent finished";
        pushActivity(idx, { type: "agent-end", label });
        break;
      }

      case "delegate:start": {
        const d = tryParseJson(event.data);
        const label =
          d?.from && d?.to
            ? `Delegating: ${d.from} \u2192 ${d.to}`
            : "Delegating to sub-agent";
        pushActivity(idx, { type: "delegate-start", label, detail: d?.reason });
        break;
      }

      case "delegate:end": {
        const d = tryParseJson(event.data);
        const label = d?.agent ? `Delegate complete: ${d.agent}` : "Delegate complete";
        pushActivity(idx, { type: "delegate-end", label });
        break;
      }

      case "tool:call": {
        const d = tryParseJson(event.data);
        const label = d?.tool ? `Tool call: ${d.tool}` : "Tool call";
        pushActivity(idx, {
          type: "tool-call",
          label,
          detail: d?.args ? JSON.stringify(d.args) : undefined,
        });
        break;
      }

      case "tool:result": {
        const d = tryParseJson(event.data);
        const label = d?.tool ? `Tool result: ${d.tool}` : "Tool result";
        pushActivity(idx, { type: "tool-result", label });
        break;
      }

      case "agent:think": {
        const d = tryParseJson(event.data);
        const label = d?.text ? `Thinking: ${d.text.slice(0, 80)}` : "Thinking...";
        pushActivity(idx, { type: "agent-think", label });
        break;
      }

      case "agent:plan": {
        const d = tryParseJson(event.data);
        const count = d?.tasks?.length ?? d?.steps?.length;
        const label = count ? `Plan: ${count} tasks` : "Planning...";
        pushActivity(idx, { type: "agent-plan", label, detail: d?.summary });
        break;
      }

      case "done": {
        const d = tryParseJson(event.data);
        if (d?.conversationId) setConversationId(d.conversationId);
        if (d?.usage) setStore("exchanges", idx, "usage", d.usage);
        break;
      }
    }
  }

  function pushActivity(idx: number, activity: ActivityEvent) {
    const len = store.exchanges[idx].activityLog.length;
    setStore("exchanges", idx, "activityLog", len, activity);
  }

  function tryParseJson(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // ---------- Play response audio ----------

  async function handlePlayResponse(text: string) {
    try {
      setStatus("speaking");
      const blob = await speak(text, { speaker: selectedSpeaker() });
      await player.play(blob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Playback failed";
      setErrorMsg(msg);
    } finally {
      setStatus("idle");
    }
  }

  // ---------- Helpers ----------

  function statusLabel(): string {
    switch (status()) {
      case "recording":
        return "Recording...";
      case "transcribing":
        return "Transcribing...";
      case "reviewing":
        return "Review transcription";
      case "streaming":
        return "Agent is working...";
      case "speaking":
        return "Playing audio...";
      default:
        return "Hold to speak";
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function activityIcon(type: ActivityEvent["type"]): string {
    switch (type) {
      case "delegate-start":
      case "delegate-end":
        return "\u21AA";
      case "tool-call":
        return "\u2692";
      case "tool-result":
        return "\u2713";
      case "agent-think":
        return "\u2026";
      case "agent-plan":
        return "\u25B6";
      case "agent-start":
        return "\u25CB";
      case "agent-end":
        return "\u25CF";
      default:
        return "\u2022";
    }
  }

  // ---------- JSX ----------

  return (
    <div class="vc-root">
      {/* Header */}
      <header class="vc-header">
        <div class="vc-header-left">
          <div class="vc-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <h1 class="vc-title">Voice Agent</h1>
        </div>
        <button
          class="vc-settings-btn"
          onClick={() => setShowSettings(!showSettings())}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Settings panel */}
      <Show when={showSettings()}>
        <div class="vc-settings">
          <div class="vc-setting-row">
            <label class="vc-label">Voice</label>
            <select
              class="vc-select"
              value={selectedSpeaker()}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
            >
              <For each={speakers()}>
                {(s) => <option value={s.voiceId}>{s.name}</option>}
              </For>
              <Show when={speakers().length === 0}>
                <option value="alloy">Alloy (default)</option>
              </Show>
            </select>
          </div>
        </div>
      </Show>

      {/* Conversation history */}
      <div class="vc-history" ref={scrollRef}>
        <Show when={store.exchanges.length === 0}>
          <div class="vc-empty">
            <div class="vc-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <p class="vc-empty-text">Hold the microphone to start a conversation</p>
            <p class="vc-empty-sub">
              Hold to record, release to review, then send to the supervisor agent
            </p>
          </div>
        </Show>

        <For each={store.exchanges}>
          {(ex) => (
            <div class="vc-exchange">
              {/* User bubble */}
              <div class="vc-bubble vc-user">
                <div class="vc-bubble-header">
                  <span class="vc-bubble-role">You</span>
                  <span class="vc-bubble-time">{formatTime(ex.timestamp)}</span>
                </div>
                <p>{ex.userText}</p>
              </div>

              {/* Activity log */}
              <Show when={ex.activityLog.length > 0}>
                <div class="vc-activity-log">
                  <For each={ex.activityLog}>
                    {(activity) => (
                      <div class={`vc-activity-item vc-activity-${activity.type}`}>
                        <span class="vc-activity-icon">{activityIcon(activity.type)}</span>
                        <span class="vc-activity-label">{activity.label}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Agent bubble */}
              <Show when={ex.agentText}>
                <div class="vc-bubble vc-agent">
                  <div class="vc-bubble-header">
                    <span class="vc-bubble-role">Agent</span>
                    <span class="vc-bubble-time">{formatTime(ex.timestamp)}</span>
                  </div>
                  <p>{ex.agentText}</p>
                  <Show when={ex.isComplete}>
                    <button
                      class="vc-play-btn"
                      onClick={() => handlePlayResponse(ex.agentText)}
                      disabled={player.isPlaying()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                      Play
                    </button>
                  </Show>
                </div>
              </Show>

              {/* Streaming indicator when no text yet */}
              <Show when={!ex.agentText && !ex.isComplete}>
                <div class="vc-bubble vc-agent vc-agent-streaming">
                  <div class="vc-bubble-header">
                    <span class="vc-bubble-role">Agent</span>
                  </div>
                  <span class="vc-typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>

      {/* Review area */}
      <Show when={status() === "reviewing"}>
        <div class="vc-review">
          <input
            class="vc-review-input"
            type="text"
            value={reviewText()}
            onInput={(e) => setReviewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
              if (e.key === "Escape") handleCancelReview();
            }}
            placeholder="Edit transcription..."
            ref={(el: HTMLInputElement) => setTimeout(() => el.focus())}
          />
          <div class="vc-review-actions">
            <button class="vc-send-btn" onClick={handleSend} disabled={!reviewText().trim()}>
              Send
            </button>
            <button class="vc-cancel-btn" onClick={handleCancelReview}>
              Cancel
            </button>
          </div>
        </div>
      </Show>

      {/* Error display */}
      <Show when={errorMsg()}>
        <div class="vc-error">
          <span>{errorMsg()}</span>
          <button onClick={() => setErrorMsg(null)} class="vc-error-dismiss">
            &times;
          </button>
        </div>
      </Show>

      {/* Bottom controls */}
      <div class="vc-controls">
        <div class="vc-status">{statusLabel()}</div>

        <button
          class={`vc-mic-btn ${status() === "recording" ? "recording" : ""} ${
            status() !== "idle" && status() !== "recording" && status() !== "reviewing"
              ? "processing"
              : ""
          }`}
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onMouseLeave={() => {
            if (recorder.isRecording()) handleMicUp();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMicDown();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMicUp();
          }}
          disabled={status() !== "idle" && status() !== "recording"}
        >
          <Show
            when={status() === "recording"}
            fallback={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            }
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </Show>
        </button>

        <Show when={player.isPlaying()}>
          <button class="vc-stop-btn" onClick={() => player.stop()}>
            Stop playback
          </button>
        </Show>
      </div>
    </div>
  );
}
