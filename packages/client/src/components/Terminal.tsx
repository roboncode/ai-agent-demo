import { type Component, For, createEffect } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import TerminalLine from "./TerminalLine";
import { FiTerminal } from "solid-icons/fi";

interface Props {
  lines: TLine[];
  streamingText: string;
  isStreaming: boolean;
  title?: string;
  footer?: any;
}

const Terminal: Component<Props> = (props) => {
  let scrollRef: HTMLDivElement | undefined;

  createEffect(() => {
    props.lines.length;
    props.streamingText;
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  });

  return (
    <div class="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-terminal shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
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
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        class="terminal-scroll flex-1 overflow-y-auto px-5 py-4 font-mono text-[13px] leading-[1.7]"
      >
        <For each={props.lines}>
          {(line) => <TerminalLine line={line} />}
        </For>

        {props.streamingText && (
          <div class="whitespace-pre-wrap break-words text-ansi-green">
            {props.streamingText}
          </div>
        )}

        {props.isStreaming && (
          <span class="cursor-blink inline-block text-accent-bright">_</span>
        )}
      </div>

      {/* Footer */}
      {props.footer && (
        <div class="terminal-titlebar px-4 py-2.5">{props.footer}</div>
      )}
    </div>
  );
};

export default Terminal;
