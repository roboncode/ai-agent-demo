import { createSignal, onMount, onCleanup, createMemo, Show } from "solid-js";
import type { TerminalLine, DemoConfig } from "./types";
import { slides } from "./data/slides";
import SlideShell from "./components/SlideShell";
import SlideContent from "./components/SlideContent";
import SlideNav from "./components/SlideNav";
import Terminal from "./components/Terminal";
import ApprovalButtons from "./components/ApprovalButtons";
import ShortcutsHelp from "./components/ShortcutsHelp";
import { runDemo, runApproval } from "./lib/demo-runner";
import { badgeClass } from "./lib/section-colors";
import { getStreamMode, setStreamMode } from "./lib/api";
import { FiGithub } from "solid-icons/fi";

function App() {
  const initialSlide = () => {
    const param = new URLSearchParams(window.location.search).get("s");
    const n = parseInt(param ?? "1", 10);
    return isNaN(n) ? 0 : Math.min(Math.max(n - 1, 0), slides.length - 1);
  };
  const [slideIndex, setSlideIndex] = createSignal(initialSlide());
  const [showShortcuts, setShowShortcuts] = createSignal(false);
  // Per-slide terminal output: keyed by slide index
  const [slideLines, setSlideLines] = createSignal<Record<number, TerminalLine[]>>({});
  const [streamingText, setStreamingText] = createSignal("");
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [isRunning, setIsRunning] = createSignal(false);
  const [awaitingApproval, setAwaitingApproval] = createSignal<string | null>(null);
  const [streamMode, setStreamModeSignal] = createSignal(getStreamMode());

  const currentSlide = createMemo(() => slides[slideIndex()]);
  const hasDemo = createMemo(() => !!currentSlide().demo || !!currentSlide().demoButtons?.length);
  // Derived: lines for the currently visible slide
  const lines = createMemo(() => slideLines()[slideIndex()] ?? []);

  let lineCounter = 0;

  function addLine(type: TerminalLine["type"], content: string) {
    const id = `line-${lineCounter++}`;
    const idx = slideIndex();
    setSlideLines((prev) => ({
      ...prev,
      [idx]: [...(prev[idx] ?? []), { id, type, content }],
    }));
  }

  function clearTerminal() {
    const idx = slideIndex();
    setSlideLines((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setStreamingText("");
    setAwaitingApproval(null);
  }

  function navigate(index: number) {
    if (index >= 0 && index < slides.length && index !== slideIndex()) {
      setSlideIndex(index);
      history.replaceState(null, "", `?s=${index + 1}`);
      // Stop any in-flight run; preserve per-slide output
      setIsRunning(false);
      setIsStreaming(false);
      setStreamingText("");
      setAwaitingApproval(null);
    }
  }

  async function handleRun(demo?: DemoConfig) {
    const activeDemo = demo ?? currentSlide().demo;
    if (!activeDemo || isRunning()) return;

    // Always clear this slide's previous output before a fresh run
    clearTerminal();
    setIsRunning(true);

    await runDemo(activeDemo, {
      addLine,
      setStreamingText,
      setIsStreaming,
      setAwaitingApproval,
    });

    setIsRunning(false);
  }

  async function handleApproval(approved: boolean) {
    const actionId = awaitingApproval();
    if (!actionId) return;

    setAwaitingApproval(null);
    const demo = currentSlide().demo;
    if (demo?.type !== "multi-step") return;

    setIsRunning(true);
    await runApproval(demo.approveEndpoint, actionId, approved, { addLine });
    setIsRunning(false);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      navigate(slideIndex() + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(slideIndex() - 1);
    } else if (e.key === "k" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      clearTerminal();
    } else if (e.key === "s" && !e.metaKey && !e.ctrlKey) {
      const next = streamMode() === "sse" ? "ws" : "sse";
      setStreamMode(next);
      setStreamModeSignal(next);
    } else if (e.key === "?" || e.key === "/") {
      setShowShortcuts((v) => !v);
    } else if (e.key === "Escape") {
      setShowShortcuts(false);
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  const terminalFooter = () => {
    if (!awaitingApproval()) return null;
    return (
      <div class="flex items-center gap-2">
        <ApprovalButtons onApprove={handleApproval} />
      </div>
    );
  };

  return (
    <div class="flex h-full flex-col bg-root font-body">
      {/* Top bar */}
      <div class="top-bar relative z-10 flex h-12 items-center justify-between px-8">
        <div class="flex items-center gap-3">
          <div class="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(52,216,204,0.4)]" />
          <span class="font-display text-sm font-bold tracking-wider text-heading uppercase">
            Building AI Agents
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={() => {
              const next = streamMode() === "sse" ? "ws" : "sse";
              setStreamMode(next);
              setStreamModeSignal(next);
            }}
            class="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-muted opacity-60 transition-colors hover:border-white/20 hover:text-primary hover:opacity-100"
            title={`Stream mode: ${streamMode()}. Click or press S to toggle.`}
          >
            {streamMode() === "sse" ? "SSE" : "WS"}
          </button>
          <span class="font-mono text-[10px] text-muted opacity-50" title={__BUILD_TIME__}>
            {new Date(__BUILD_TIME__).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
          <a
            href="https://github.com/roboncode/ai-agent-demo"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center rounded-full p-1.5 text-primary transition-colors hover:text-accent"
            title="View on GitHub"
          >
            <FiGithub size={14} />
          </a>
          <span class={`section-badge ${badgeClass(currentSlide().section)} rounded-full px-3 py-1 font-mono text-[11px]`}>
            {currentSlide().category}
          </span>
        </div>
      </div>

      {/* Main area */}
      <div class="slide-enter flex-1 overflow-hidden" style={`--slide-key: ${slideIndex()}`}>
        <SlideShell
          hasDemo={hasDemo()}
          content={
            <SlideContent
              slide={currentSlide()}
              fullWidth={!hasDemo()}
              onRun={handleRun}
              isRunning={isRunning()}
            />
          }
          terminal={
            hasDemo() ? (
              <Terminal
                lines={lines()}
                streamingText={streamingText()}
                isStreaming={isStreaming()}
                title={currentSlide().demo?.type === "sse" ? "stream" : "output"}
                footer={terminalFooter()}
              />
            ) : undefined
          }
        />
      </div>

      {/* Bottom nav */}
      <SlideNav
        total={slides.length}
        current={slideIndex()}
        onNavigate={navigate}
        onShowShortcuts={() => setShowShortcuts((v) => !v)}
      />

      {/* Keyboard shortcuts popover */}
      <Show when={showShortcuts()}>
        <ShortcutsHelp onClose={() => setShowShortcuts(false)} />
      </Show>
    </div>
  );
}

export default App;
