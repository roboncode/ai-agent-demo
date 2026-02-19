import { type Component, For, Show, createComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { SlideConfig } from "../types";
import { badgeClass } from "../lib/section-colors";
import CodeBlock from "./CodeBlock";

interface Props {
  slide: SlideConfig;
  fullWidth: boolean;
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
            class={`mb-10 font-body text-[1.1rem] italic text-muted ${
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
                    <span class="mt-[11px] h-2 w-2 flex-shrink-0 rounded-full bg-accent shadow-[0_0_6px_rgba(52,216,204,0.4)]" />
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

        {/* Code snippet — only if no demo and no custom visual */}
        <Show when={props.slide.code && !props.slide.demo && !props.slide.visual}>
          <CodeBlock code={props.slide.code!} />
        </Show>

        {/* Demo hint — only if has demo */}
        <Show when={props.slide.demoHint && props.slide.demo}>
          <div
            class={`demo-hint mt-2 inline-flex items-center gap-3 rounded-xl px-5 py-3 ${
              props.fullWidth ? "" : ""
            }`}
          >
            <span class="text-lg text-accent">&#9654;</span>
            <span class="font-body text-sm text-accent-dim">
              Watch: {props.slide.demoHint}
            </span>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SlideContent;
