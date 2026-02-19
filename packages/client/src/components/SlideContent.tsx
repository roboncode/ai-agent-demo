import { type Component, For, Show, createComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { SlideConfig, DemoConfig } from "../types";
import { badgeClass } from "../lib/section-colors";
import CodeBlock from "./CodeBlock";
import { FiChevronRight } from "solid-icons/fi";

interface Props {
  slide: SlideConfig;
  fullWidth: boolean;
  onRun?: (demo?: DemoConfig) => void;
  isRunning?: boolean;
}

const SlideContent: Component<Props> = (props) => {
  return (
    <div
      class={`slide-scroll h-full overflow-y-auto ${
        props.fullWidth
          ? "flex flex-col items-center justify-center px-16 py-14"
          : "px-12 pt-14 pb-10"
      }`}
    >
      <div class={props.fullWidth ? "w-full max-w-[900px] text-center" : ""}>
        {/* Section badge */}
        <div class={props.fullWidth ? "mb-5" : "mb-5"}>
          <span
            class={`section-badge ${badgeClass(props.slide.section)} inline-block rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide`}
          >
            {props.slide.section}
          </span>
        </div>

        {/* Icon */}
        <Show when={props.slide.icon}>
          <div class={props.fullWidth ? "mb-6 flex justify-center" : "mb-6"}>
            <div
              class={`icon-glow inline-flex items-center justify-center rounded-2xl ${
                props.fullWidth ? "h-20 w-20" : "h-16 w-16"
              }`}
            >
              <Dynamic
                component={props.slide.icon!}
                size={props.fullWidth ? 36 : 28}
                class="text-accent"
              />
            </div>
          </div>
        </Show>

        {/* Title */}
        <h1
          class={`mb-3 font-display font-bold leading-[1.15] tracking-tight text-heading ${
            props.fullWidth ? "text-[3.25rem]" : "text-[2.5rem]"
          }`}
        >
          {props.slide.title}
        </h1>

        {/* Subtitle */}
        <Show when={props.slide.subtitle}>
          <p
            class={`mb-10 font-body text-[1.1rem] italic text-secondary ${
              props.fullWidth ? "" : ""
            }`}
          >
            {props.slide.subtitle}
          </p>
        </Show>

        {/* Bullets */}
        <Show when={props.slide.bullets.length > 0}>
          <ul
            class={`mb-10 space-y-6 ${props.fullWidth ? "mx-auto max-w-[600px]" : ""}`}
          >
            <For each={props.slide.bullets}>
              {(bullet) => (
                <li
                  class={`flex items-start gap-4 font-body text-[1.25rem] leading-relaxed text-secondary ${
                    props.fullWidth ? "justify-center text-center" : ""
                  }`}
                >
                  <Show when={!props.fullWidth}>
                    <span class="mt-[5px] flex-shrink-0 text-accent" style={{"filter": "drop-shadow(0 0 4px rgba(52,216,204,0.5))"}}>
                      <FiChevronRight size={20} />
                    </span>
                  </Show>
                  <span>{bullet}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>

        {/* Custom visual — takes priority over code block */}
        <Show when={props.slide.visual}>
          {createComponent(props.slide.visual!, {})}
        </Show>

        {/* Code snippet — only if no custom visual */}
        <Show when={props.slide.code && !props.slide.visual}>
          <Show when={props.slide.codeLabel}>
            <p class="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-secondary">
              {props.slide.codeLabel}
            </p>
          </Show>
          <CodeBlock code={props.slide.code!} />
        </Show>

        {/* Multiple demo buttons */}
        <Show when={props.slide.demoButtons?.length}>
          <div class={`mt-8 flex flex-col gap-3 ${props.fullWidth ? "items-center" : ""}`}>
            <For each={props.slide.demoButtons}>
              {(btn) => (
                <button
                  onClick={() => props.onRun?.(btn.demo)}
                  disabled={props.isRunning}
                  class="demo-hint btn-glow inline-flex cursor-pointer items-center gap-3 rounded-xl px-5 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span class="text-accent">&#9654;</span>
                  <span class="font-body text-sm text-accent-dim">{btn.label}</span>
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Single demo hint button — hidden when demoButtons is used */}
        <Show when={props.slide.demoHint && props.slide.demo && !props.slide.demoButtons?.length}>
          <button
            onClick={() => props.onRun?.()}
            disabled={props.isRunning}
            class="demo-hint btn-glow mt-8 inline-flex cursor-pointer items-center gap-3 rounded-xl px-5 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="text-lg text-accent">
              {props.isRunning ? <span class="spinner inline-block" /> : <>&#9654;</>}
            </span>
            <span class="font-body text-sm text-accent-dim">
              {props.isRunning ? "Running..." : `Watch: ${props.slide.demoHint}`}
            </span>
          </button>
        </Show>
      </div>
    </div>
  );
};

export default SlideContent;
