import { type Component, Show, For } from "solid-js";
import { FiUser, FiCpu } from "solid-icons/fi";
import { MarkdownText } from "../../lib/markdown";
import WeatherCard, { type WeatherData } from "./WeatherCard";
import LinkCard, { type LinkCardData } from "./LinkCard";

export interface CardAttachment {
  type: "weather" | "link";
  data: WeatherData | LinkCardData;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  isStreaming?: boolean;
  cards?: CardAttachment[];
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
      <div class="min-w-0 flex-1">
        {/* Tool calls — data kept on message but hidden from display for now */}

        {/* Rich cards (weather, links) — full width */}
        <Show when={props.message.cards?.length}>
          <For each={props.message.cards}>
            {(card) => (
              <Show when={card.type === "weather"} fallback={
                <LinkCard data={card.data as LinkCardData} />
              }>
                <WeatherCard data={card.data as WeatherData} />
              </Show>
            )}
          </For>
        </Show>

        {/* Message content — constrained width */}
        <Show when={props.message.content}>
          <div
            class={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed text-left ${
              isUser()
                ? "rounded-tl-md bg-blue-500/15 text-primary border border-blue-500/10"
                : "rounded-tl-md bg-white/[0.04] text-primary border border-white/[0.05]"
            }`}
          >
            <Show when={isUser()} fallback={
              <MarkdownText content={props.message.content} />
            }>
              <span class="whitespace-pre-wrap">{props.message.content}</span>
            </Show>
            <Show when={props.message.isStreaming}>
              <span class="cursor-blink ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px] bg-emerald-400/70" />
            </Show>
          </div>
        </Show>

        {/* Streaming placeholder when no content yet */}
        <Show when={!props.message.content && props.message.isStreaming}>
          <div class="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.04] text-primary border border-white/[0.05] px-3.5 py-2.5 text-[13px]">
            <span class="cursor-blink inline-block h-[14px] w-[2px] translate-y-[2px] bg-emerald-400/70" />
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MessageBubble;
