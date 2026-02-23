import { type Component, createSignal, Show } from "solid-js";
import { FiSend, FiMic } from "solid-icons/fi";
import { useAudioRecorder } from "../../lib/useAudioRecorder";
import { transcribeAudio } from "../../lib/api";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_ROWS = 5;
const LINE_HEIGHT = 20; // matches text-[13px] leading-[20px]

const ChatInput: Component<Props> = (props) => {
  const [text, setText] = createSignal("");
  const [isTranscribing, setIsTranscribing] = createSignal(false);
  const { isRecording, start, stop } = useAudioRecorder();
  let textareaRef: HTMLTextAreaElement | undefined;

  function autoResize() {
    const el = textareaRef;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }

  function handleInput(e: InputEvent) {
    setText((e.target as HTMLTextAreaElement).value);
    autoResize();
  }

  function handleSubmit(e?: Event) {
    e?.preventDefault();
    const value = text().trim();
    if (!value || props.disabled) return;
    props.onSend(value);
    setText("");
    if (textareaRef) {
      textareaRef.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  }

  async function handleMicDown() {
    if (isRecording() || isTranscribing()) return;
    try {
      await start();
    } catch {
      // mic access denied
    }
  }

  async function handleMicUp() {
    if (!isRecording()) return;
    try {
      setIsTranscribing(true);
      const blob = await stop();
      const result = await transcribeAudio(blob);
      if (result.text) {
        setText((prev) => {
          const sep = prev && !prev.endsWith(" ") ? " " : "";
          return prev + sep + result.text;
        });
        requestAnimationFrame(() => autoResize());
      }
    } catch {
      // transcription failed
    } finally {
      setIsTranscribing(false);
    }
  }

  const micActive = () => isRecording() || isTranscribing();

  return (
    <form onSubmit={handleSubmit} class="border-t border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div class="flex items-end gap-2">
        {/* Input group: textarea + mic in one bordered container */}
        <div
          class="flex flex-1 items-end rounded-lg border border-white/[0.08] bg-white/[0.03] transition-colors focus-within:border-white/[0.15] focus-within:bg-white/[0.04]"
        >
          <textarea
            ref={textareaRef}
            value={text()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={props.placeholder ?? "Message..."}
            disabled={props.disabled}
            rows={1}
            class="flex-1 resize-none bg-transparent py-2 pl-3 pr-1 font-body text-[13px] leading-[20px] text-primary placeholder:text-muted/50 outline-none disabled:opacity-40"
          />
          {/* Mic button */}
          <button
            type="button"
            class={`mb-1 mr-1 flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md transition-all ${
              isRecording()
                ? "mic-recording bg-red-500/20 text-red-400"
                : isTranscribing()
                  ? "bg-orange-500/10 text-orange-400/50"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]"
            }`}
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onMouseLeave={() => { if (isRecording()) handleMicUp(); }}
            onTouchStart={(e) => { e.preventDefault(); handleMicDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); handleMicUp(); }}
            disabled={props.disabled || isTranscribing()}
            title={isRecording() ? "Release to transcribe" : "Hold to record"}
          >
            <Show when={isTranscribing()} fallback={<FiMic size={14} />}>
              <span class="spinner !h-3.5 !w-3.5 !border-[1.5px] !border-white/10 !border-t-orange-400/60" />
            </Show>
          </button>
        </div>

        {/* Send button — same height as input group at single-row */}
        <button
          type="submit"
          disabled={props.disabled || !text().trim() || micActive()}
          class="flex h-[36px] w-[36px] flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <FiSend size={16} />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
