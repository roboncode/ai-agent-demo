import { createSignal, onMount, onCleanup, createMemo, Show } from "solid-js";
import type { TerminalLine } from "./types";
import { slides } from "./data/slides";
import SlideShell from "./components/SlideShell";
import SlideContent from "./components/SlideContent";
import SlideNav from "./components/SlideNav";
import Terminal from "./components/Terminal";
import RunButton from "./components/RunButton";
import ApprovalButtons from "./components/ApprovalButtons";
import { runDemo, runApproval } from "./lib/demo-runner";

function App() {
  const [slideIndex, setSlideIndex] = createSignal(0);
  const [lines, setLines] = createSignal<TerminalLine[]>([]);
  const [streamingText, setStreamingText] = createSignal("");
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [isRunning, setIsRunning] = createSignal(false);
  const [awaitingApproval, setAwaitingApproval] = createSignal<string | null>(
    null,
  );

  const currentSlide = createMemo(() => slides[slideIndex()]);
  const hasDemo = createMemo(() => !!currentSlide().demo);

  let lineCounter = 0;

  function addLine(type: TerminalLine["type"], content: string) {
    const id = `line-${lineCounter++}`;
    setLines((prev) => [...prev, { id, type, content }]);
  }

  function clearTerminal() {
    setLines([]);
    setStreamingText("");
    setAwaitingApproval(null);
  }

  // Clear terminal when navigating slides
  function navigate(index: number) {
    if (index >= 0 && index < slides.length && index !== slideIndex()) {
      setSlideIndex(index);
      clearTerminal();
      setIsRunning(false);
      setIsStreaming(false);
    }
  }

  async function handleRun() {
    const demo = currentSlide().demo;
    if (!demo || isRunning()) return;

    clearTerminal();
    setIsRunning(true);

    await runDemo(demo, {
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

  // Keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      navigate(slideIndex() + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(slideIndex() - 1);
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  const terminalFooter = () => {
    const demo = currentSlide().demo;
    if (!demo) return null;

    return (
      <div class="flex items-center gap-2">
        <Show
          when={awaitingApproval()}
          fallback={
            <RunButton
              onRun={handleRun}
              onClear={clearTerminal}
              isRunning={isRunning()}
              hasOutput={lines().length > 0 || !!streamingText()}
            />
          }
        >
          <ApprovalButtons onApprove={handleApproval} />
        </Show>
      </div>
    );
  };

  return (
    <div class="flex h-full flex-col bg-root">
      {/* Top bar */}
      <div class="flex h-12 items-center justify-between border-b border-border px-6">
        <span class="font-display text-sm font-bold tracking-wide text-heading">
          Building AI Agents
        </span>
        <span class="font-mono text-xs text-muted">
          {currentSlide().category}
        </span>
      </div>

      {/* Main area */}
      <div class="slide-enter flex-1 overflow-hidden" style={`--slide-key: ${slideIndex()}`}>
        <SlideShell
          hasDemo={hasDemo()}
          content={
            <SlideContent
              slide={currentSlide()}
              fullWidth={!hasDemo()}
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
      />
    </div>
  );
}

export default App;
