import { type Component, For, Show, createEffect, createSignal } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import TerminalLine from "./TerminalLine";
import { speakText } from "../lib/api";
import { chunkedSpeak } from "../lib/chunked-speak";
import { FiTerminal, FiArrowDown } from "solid-icons/fi";

interface Props {
  lines: TLine[];
  streamingText: string;
  isStreaming: boolean;
  title?: string;
  footer?: any;
  /** Text-only response content for TTS playback */
  responseText?: string;
}

const SCROLL_THRESHOLD = 60; // px from bottom to be considered "at bottom"

const Terminal: Component<Props> = (props) => {
  let scrollRef: HTMLDivElement | undefined;
  const [, setIsAtBottom] = createSignal(true);
  const [userScrolled, setUserScrolled] = createSignal(false);
  const [isSpeaking, setIsSpeaking] = createSignal(false);

  let audioCtx: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let activeSources: AudioBufferSourceNode[] = [];
  let nextStartTime = 0;
  let pendingCount = 0;
  let doneResolve: (() => void) | null = null;
  let stopped = false;

  function getContext(): AudioContext {
    if (!audioCtx) {
      audioCtx = new AudioContext();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function findStartGap(buffer: AudioBuffer): number {
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > 0.0005) {
        return Math.max(0, i - 1) / buffer.sampleRate;
      }
    }
    return 0;
  }

  async function scheduleBlob(blob: Blob): Promise<void> {
    const ctx = getContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const startGap = findStartGap(audioBuffer);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode!);

    const startTime = Math.max(ctx.currentTime + 0.005, nextStartTime);
    source.start(startTime, startGap);
    nextStartTime = startTime + (audioBuffer.duration - startGap);

    activeSources.push(source);
    pendingCount++;

    source.onended = () => {
      pendingCount--;
      const idx = activeSources.indexOf(source);
      if (idx !== -1) activeSources.splice(idx, 1);
      if (pendingCount === 0 && doneResolve) {
        doneResolve();
        doneResolve = null;
      }
    };
  }

  function waitForEnd(): Promise<void> {
    if (pendingCount === 0) return Promise.resolve();
    return new Promise((resolve) => { doneResolve = resolve; });
  }

  const canSpeak = () => !!props.responseText && !props.isStreaming;

  async function handlePlay() {
    if (!props.responseText || isSpeaking()) return;
    stopped = false;
    try {
      setIsSpeaking(true);
      await chunkedSpeak(
        props.responseText,
        (chunk) => speakText(chunk),
        scheduleBlob,
        waitForEnd,
        () => stopped,
      );
    } catch {
      // ignore — stop or playback error
    } finally {
      setIsSpeaking(false);
    }
  }

  function handleStop() {
    stopped = true;
    for (const s of activeSources) {
      try { s.stop(); } catch { /* already stopped */ }
    }
    activeSources = [];
    pendingCount = 0;
    nextStartTime = 0;
    if (doneResolve) {
      doneResolve();
      doneResolve = null;
    }
    setIsSpeaking(false);
  }

  // Stop audio when terminal clears (new run starts)
  createEffect(() => {
    if (props.lines.length === 0) {
      handleStop();
    }
  });

  function checkIfAtBottom() {
    if (!scrollRef) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }

  function scrollToBottom() {
    if (scrollRef) {
      scrollRef.scrollTo({ top: scrollRef.scrollHeight, behavior: "smooth" });
    }
    setUserScrolled(false);
    setIsAtBottom(true);
  }

  function handleScroll() {
    if (!scrollRef) return;
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    if (!atBottom) {
      setUserScrolled(true);
    } else {
      setUserScrolled(false);
    }
  }

  // Auto-scroll only when at bottom (user hasn't scrolled up)
  createEffect(() => {
    props.lines.length;
    props.streamingText;
    if (!userScrolled() && scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  });

  // When a new run starts (lines cleared), reset scroll state
  createEffect(() => {
    if (props.lines.length === 0) {
      setUserScrolled(false);
      setIsAtBottom(true);
    }
  });

  return (
    <div class="relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-terminal shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* Title bar */}
      <div class="terminal-titlebar flex items-center gap-2.5 px-4 py-2.5">
        <div class="flex gap-2">
          <div class="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_4px_rgba(255,95,87,0.3)]" />
          <div class="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_4px_rgba(254,188,46,0.3)]" />
          <div class="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_4px_rgba(40,200,64,0.3)]" />
        </div>
        <div class="ml-1 flex items-center gap-1.5 text-muted">
          <FiTerminal size={11} />
          <span class="font-mono text-[11px] tracking-wide">
            {props.title ?? "terminal"}
          </span>
        </div>

        {/* Play response button — right side of titlebar */}
        <Show when={canSpeak() || isSpeaking()}>
          <button
            onClick={isSpeaking() ? handleStop : handlePlay}
            class="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-muted transition-colors hover:text-accent"
            title={isSpeaking() ? "Stop playback" : "Play response"}
          >
            <Show
              when={isSpeaking()}
              fallback={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </Show>
            <span class="font-mono text-[10px]">
              {isSpeaking() ? "stop" : "play"}
            </span>
          </button>
        </Show>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        class="terminal-scroll flex-1 overflow-y-auto px-5 py-4 font-mono text-sm leading-[1.7]"
      >
        <For each={props.lines}>
          {(line, index) => (
            <>
              {index() > 0 && props.lines[index() - 1].type !== line.type && (
                <div class="h-3" />
              )}
              <TerminalLine line={line} />
            </>
          )}
        </For>

        {(props.streamingText || props.isStreaming) && (
          <div class="break-words whitespace-pre-wrap text-ansi-green">
            {props.streamingText}
            {props.isStreaming && (
              <span class="cursor-blink text-accent-bright">█</span>
            )}
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {userScrolled() && (
        <button
          onClick={scrollToBottom}
          class="absolute bottom-8 left-1/2 flex h-11 w-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-raised text-secondary shadow-lg transition-colors hover:border-accent/40 hover:text-accent"
          aria-label="Scroll to bottom"
        >
          <FiArrowDown size={19} />
        </button>
      )}

      {/* Footer */}
      {props.footer && (
        <div class="terminal-titlebar px-4 py-2.5">{props.footer}</div>
      )}
    </div>
  );
};

export default Terminal;
