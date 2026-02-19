import { type Component, For, createEffect, createSignal, onCleanup } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import TerminalLine from "./TerminalLine";
import { FiTerminal, FiArrowDown } from "solid-icons/fi";

interface Props {
  lines: TLine[];
  streamingText: string;
  isStreaming: boolean;
  title?: string;
  footer?: any;
}

const SCROLL_THRESHOLD = 60; // px from bottom to be considered "at bottom"

const Terminal: Component<Props> = (props) => {
  let scrollRef: HTMLDivElement | undefined;
  const [isAtBottom, setIsAtBottom] = createSignal(true);
  const [userScrolled, setUserScrolled] = createSignal(false);

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
