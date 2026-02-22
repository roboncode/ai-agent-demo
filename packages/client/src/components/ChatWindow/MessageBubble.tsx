import { type Component, Show, For } from "solid-js";
import { FiUser, FiCpu, FiTool } from "solid-icons/fi";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  isStreaming?: boolean;
}

interface Props {
  message: ChatMessage;
}

const MessageBubble: Component<Props> = (props) => {
  const isUser = () => props.message.role === "user";

  return (
    <div class="flex gap-3">
      {/* Avatar */}
      <div
        class={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg mt-0.5 ${
          isUser()
            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
        }`}
      >
        {isUser() ? <FiUser size={14} /> : <FiCpu size={14} />}
      </div>

      {/* Bubble */}
      <div class="max-w-[85%]">
        {/* Tool calls (before text, only for assistant) */}
        <Show when={!isUser() && props.message.toolCalls?.length}>
          <div class="mb-1.5 flex flex-wrap gap-1">
            <For each={props.message.toolCalls}>
              {(tool) => (
                <span class="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 border border-white/[0.06]">
                  <FiTool size={10} class="text-amber-400/60" />
                  <span class="font-mono text-[10px] text-muted">{tool}</span>
                </span>
              )}
            </For>
          </div>
        </Show>

        {/* Message content */}
        <div
          class={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed text-left ${
            isUser()
              ? "rounded-tl-md bg-blue-500/15 text-primary border border-blue-500/10"
              : "rounded-tl-md bg-white/[0.04] text-primary border border-white/[0.05]"
          }`}
        >
          <span class="whitespace-pre-wrap">{props.message.content}</span>
          <Show when={props.message.isStreaming}>
            <span class="cursor-blink ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] bg-emerald-400/70" />
          </Show>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
