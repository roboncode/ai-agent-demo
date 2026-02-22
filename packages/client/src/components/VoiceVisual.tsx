import { type Component, Show, createSignal } from "solid-js";
import type { VisualProps, SseDemoConfig } from "../types";
import { useAudioRecorder } from "../lib/useAudioRecorder";
import { transcribeAudio, speakText } from "../lib/api";

type Status = "idle" | "recording" | "transcribing";

const VoiceVisual: Component<VisualProps> = (props) => {
  const { isRecording, error: recorderError, start, stop } = useAudioRecorder();
  const [status, setStatus] = createSignal<Status>("idle");
  const [transcript, setTranscript] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [isSpeaking, setIsSpeaking] = createSignal(false);

  let audioEl: HTMLAudioElement | null = null;
  let blobUrl: string | null = null;

  async function handleMicDown() {
    if (status() !== "idle") return;
    try {
      setError(null);
      setTranscript(null);
      await start();
      setStatus("recording");
    } catch {
      setError(recorderError() ?? "Failed to start recording");
    }
  }

  async function handleMicUp() {
    if (!isRecording()) return;
    try {
      setStatus("transcribing");
      const blob = await stop();
      const result = await transcribeAudio(blob);
      setTranscript(result.text);

      // Fire the SSE demo
      const demo: SseDemoConfig = {
        type: "sse",
        endpoint: "/api/agents/supervisor",
        body: { message: result.text },
      };
      props.onRun?.(demo);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
      setStatus("idle");
    }
  }

  async function handlePlay() {
    const text = props.lastResponseText;
    if (!text || isSpeaking()) return;

    try {
      setIsSpeaking(true);
      const blob = await speakText(text);

      // Clean up previous blob URL
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);

      audioEl = new Audio(blobUrl);
      audioEl.onended = () => setIsSpeaking(false);
      audioEl.onerror = () => setIsSpeaking(false);
      await audioEl.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Playback failed");
      setIsSpeaking(false);
    }
  }

  function handleStopAudio() {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl = null;
    }
    setIsSpeaking(false);
  }

  const isIdle = () => status() === "idle";
  const isRec = () => status() === "recording";
  const isTranscribing = () => status() === "transcribing";
  const hasResponse = () => !!props.lastResponseText && !props.isRunning;

  return (
    <div class="flex flex-col items-center gap-6 pt-2">
      {/* Buttons row */}
      <div class="flex items-center gap-4">
        {/* Mic button */}
        <button
          class={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
            isRec()
              ? "mic-recording border-red-400 bg-red-500/20 text-red-400"
              : isTranscribing()
                ? "border-orange-400/30 bg-orange-500/10 text-orange-400/50"
                : "border-orange-400/40 bg-orange-500/10 text-orange-400 hover:border-orange-400/60 hover:bg-orange-500/15"
          }`}
          onMouseDown={handleMicDown}
          onMouseUp={handleMicUp}
          onMouseLeave={() => {
            if (isRecording()) handleMicUp();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMicDown();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMicUp();
          }}
          disabled={isTranscribing()}
        >
          <Show
            when={isRec()}
            fallback={
              <Show
                when={isTranscribing()}
                fallback={
                  /* Mic icon */
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                }
              >
                {/* Spinner */}
                <span class="spinner inline-block !h-6 !w-6 !border-orange-400/30 !border-t-orange-400" />
              </Show>
            }
          >
            {/* Stop/square icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </Show>
        </button>

        {/* Play / Stop button -- appears when there's a response */}
        <Show when={hasResponse()}>
          <button
            onClick={isSpeaking() ? handleStopAudio : handlePlay}
            class={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
              isSpeaking()
                ? "border-orange-400 bg-orange-500/20 text-orange-400"
                : "border-orange-400/40 bg-orange-500/10 text-orange-400 hover:border-orange-400/60 hover:bg-orange-500/15"
            }`}
            title={isSpeaking() ? "Stop playback" : "Play response (Fable voice)"}
          >
            <Show
              when={isSpeaking()}
              fallback={
                /* Play triangle icon */
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              }
            >
              {/* Stop square icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </Show>
          </button>
        </Show>
      </div>

      {/* Status text */}
      <div class="h-6 text-center font-mono text-sm">
        <Show when={isIdle() && !transcript() && !error() && !isSpeaking()}>
          <span class="text-secondary">Hold to speak</span>
        </Show>
        <Show when={isRec()}>
          <span class="text-red-400">Recording...</span>
        </Show>
        <Show when={isTranscribing()}>
          <span class="text-orange-400">Transcribing...</span>
        </Show>
        <Show when={isSpeaking()}>
          <span class="text-orange-400">Speaking...</span>
        </Show>
        <Show when={transcript() && isIdle() && !isSpeaking()}>
          <span class="text-primary truncate max-w-[400px] inline-block">
            "{transcript()}"
          </span>
        </Show>
        <Show when={error()}>
          <span class="text-red-400">{error()}</span>
        </Show>
      </div>
    </div>
  );
};

export default VoiceVisual;
