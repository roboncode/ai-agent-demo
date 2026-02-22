import { type Component, For, Show, createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { FiMessageSquare, FiTrash2 } from "solid-icons/fi";
import type { VisualProps } from "../../types";
import { postSse, deleteJson, getJson } from "../../lib/api";
import { parseSseStream } from "../../lib/sse-parser";
import MessageBubble, { type ChatMessage, type CardAttachment } from "./MessageBubble";
import ChatInput from "./ChatInput";
import type { WeatherData } from "./WeatherCard";
import type { LinkCardData } from "./LinkCard";

const CONV_ID = "conv_chat_demo";

// Module-level store so messages survive component unmount/remount (slide navigation).
// Using createStore (not createSignal) so <For> can track individual items by reference
// and property updates (e.g. streaming content) don't re-render the entire list.
const [messages, setMessages] = createStore<ChatMessage[]>([]);
let msgCounter = 0;
let historyLoaded = false;

const ChatWindow: Component<VisualProps> = (_props) => {
  const [_streamingTool, setStreamingTool] = createSignal<string | null>(null);
  const [isBusy, setIsBusy] = createSignal(false);
  let messagesEndRef: HTMLDivElement | undefined;
  let abortController: AbortController | null = null;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEndRef?.scrollIntoView({ behavior: "smooth" });
    });
  }

  createEffect(() => {
    // scroll whenever messages change
    messages.length;
    scrollToBottom();
  });

  onMount(async () => {
    if (historyLoaded) return;
    historyLoaded = true;
    try {
      const conv = await getJson<{
        messages: Array<{
          role: "user" | "assistant";
          content: string;
          metadata?: { cards?: CardAttachment[] };
        }>;
      }>(`/api/conversations/${CONV_ID}`);
      if (conv.messages?.length) {
        const loaded: ChatMessage[] = conv.messages.map((m) => ({
          id: `msg-${msgCounter++}`,
          role: m.role,
          content: m.content,
          ...(m.metadata?.cards?.length ? { cards: m.metadata.cards } : {}),
        }));
        setMessages(loaded);
      }
    } catch {
      // No conversation yet — that's fine
    }
  });

  onCleanup(() => {
    abortController?.abort();
  });

  async function handleClear() {
    setMessages([]);
    msgCounter = 0;
    historyLoaded = false;
    try {
      await deleteJson(`/api/conversations/${CONV_ID}`);
    } catch {
      // best-effort server-side clear
    }
  }

  /** Find the store index for a message by id */
  function msgIndex(id: string) {
    return messages.findIndex((m) => m.id === id);
  }

  async function handleSend(text: string) {
    if (isBusy()) return;

    // Add user message
    const userId = `msg-${msgCounter++}`;
    setMessages(produce((msgs) => {
      msgs.push({ id: userId, role: "user", content: text });
    }));

    // Create assistant placeholder
    const assistantId = `msg-${msgCounter++}`;
    setMessages(produce((msgs) => {
      msgs.push({ id: assistantId, role: "assistant", content: "", isStreaming: true, toolCalls: [] });
    }));

    setIsBusy(true);
    setStreamingTool(null);

    try {
      abortController = new AbortController();
      const response = await postSse("/api/agents/supervisor", {
        message: text,
        conversationId: CONV_ID,
      });

      const toolCalls: string[] = [];
      let fullText = "";

      for await (const event of parseSseStream(response)) {
        if (abortController.signal.aborted) break;
        const data = JSON.parse(event.data);

        switch (event.event) {
          case "text-delta": {
            fullText += data.text ?? "";
            const idx = msgIndex(assistantId);
            if (idx !== -1) setMessages(idx, "content", fullText);
            break;
          }
          case "tool-call": {
            toolCalls.push(data.toolName);
            setStreamingTool(data.toolName);
            const idx = msgIndex(assistantId);
            if (idx !== -1) setMessages(idx, "toolCalls", [...toolCalls]);
            break;
          }
          case "tool-result": {
            setStreamingTool(null);
            // A2UI: detect structured tool results and attach as rich cards
            const idx2 = msgIndex(assistantId);
            if (idx2 !== -1 && data.result) {
              if (data.toolName === "getWeather" && data.result.location) {
                const card: CardAttachment = { type: "weather", data: data.result as WeatherData };
                const existing = messages[idx2].cards ?? [];
                setMessages(idx2, "cards", [...existing, card]);
              }
              if (
                data.toolName === "getPageMeta" &&
                data.result.openGraph &&
                (data.result.openGraph.title || data.result.openGraph.description)
              ) {
                const og = data.result.openGraph;
                const card: CardAttachment = {
                  type: "link",
                  data: {
                    title: og.title,
                    description: og.description,
                    image: og.image,
                    url: og.url,
                    siteName: og.site_name ?? og.siteName,
                  } as LinkCardData,
                };
                const existing = messages[idx2].cards ?? [];
                setMessages(idx2, "cards", [...existing, card]);
              }
            }
            break;
          }
          case "done":
          case "cancelled": {
            break;
          }
        }
      }

      // Finalize the message
      const idx = msgIndex(assistantId);
      if (idx !== -1) {
        setMessages(idx, { isStreaming: false, content: fullText || "(no response)" });
      }
    } catch (err) {
      const idx = msgIndex(assistantId);
      if (idx !== -1) {
        setMessages(idx, { isStreaming: false, content: "Something went wrong. Try again." });
      }
    } finally {
      setIsBusy(false);
      setStreamingTool(null);
      abortController = null;
    }
  }

  return (
    <div class="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-terminal shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* Titlebar */}
      <div class="terminal-titlebar flex items-center gap-2.5 px-4 py-2.5">
        <div class="flex gap-2">
          <div class="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_4px_rgba(255,95,87,0.3)]" />
          <div class="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_4px_rgba(254,188,46,0.3)]" />
          <div class="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_4px_rgba(40,200,64,0.3)]" />
        </div>
        <div class="ml-1 flex items-center gap-1.5 text-muted">
          <FiMessageSquare size={11} />
          <span class="font-mono text-[11px] tracking-wide">conversation</span>
        </div>
        <div class="ml-auto flex items-center gap-1">
          <Show when={messages.length > 0 && !isBusy()}>
            <button
              onClick={handleClear}
              class="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-muted/50 transition-colors hover:text-red-400"
              title="Clear conversation"
            >
              <FiTrash2 size={13} />
            </button>
          </Show>
          <Show when={isBusy()}>
            <span class="spinner" />
          </Show>
        </div>
      </div>

      {/* Messages */}
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3 terminal-scroll">
        <Show
          when={messages.length > 0}
          fallback={
            <div class="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                <FiMessageSquare size={20} class="text-emerald-400/70" />
              </div>
              <p class="font-body text-[12px] text-muted">Ask a question to start a conversation</p>
              <p class="font-mono text-[10px] text-muted/50">Context is preserved across turns</p>
            </div>
          }
        >
          <For each={messages}>
            {(msg) => <MessageBubble message={msg} />}
          </For>
          {/* Tool call badge hidden from display for now */}
        </Show>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isBusy()}
        placeholder="Ask the agent anything..."
      />
    </div>
  );
};

export default ChatWindow;
