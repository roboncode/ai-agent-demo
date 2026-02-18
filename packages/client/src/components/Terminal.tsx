import { type Component, For, createEffect } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import TerminalLine from "./TerminalLine";

interface Props {
  lines: TLine[];
  streamingText: string;
  isStreaming: boolean;
  title?: string;
  footer?: any;
}

const Terminal: Component<Props> = (props) => {
  let scrollRef: HTMLDivElement | undefined;

  // Auto-scroll to bottom when new content arrives
  createEffect(() => {
    // Track reactive dependencies
    props.lines.length;
    props.streamingText;
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  });

  return (
    <div class="flex h-full flex-col rounded-lg border border-border bg-terminal">
      {/* macOS-style title bar */}
      <div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div class="flex gap-1.5">
          <div class="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <div class="h-3 w-3 rounded-full bg-[#febc2e]" />
          <div class="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span class="ml-2 font-mono text-xs text-muted">
          {props.title ?? "terminal"}
        </span>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        class="terminal-scroll flex-1 overflow-y-auto px-4 py-3 font-mono text-sm"
      >
        <For each={props.lines}>
          {(line) => <TerminalLine line={line} />}
        </For>

        {/* Streaming text accumulator */}
        {props.streamingText && (
          <div class="whitespace-pre-wrap break-words leading-relaxed text-ansi-green">
            {props.streamingText}
          </div>
        )}

        {/* Blinking cursor during streaming */}
        {props.isStreaming && (
          <span class="cursor-blink inline-block text-accent">_</span>
        )}
      </div>

      {/* Footer bar */}
      {props.footer && (
        <div class="border-t border-border px-4 py-2">{props.footer}</div>
      )}
    </div>
  );
};

export default Terminal;
