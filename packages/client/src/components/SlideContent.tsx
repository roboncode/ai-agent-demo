import { type Component, For, Show } from "solid-js";
import type { SlideConfig } from "../types";
import { badgeClass } from "../lib/section-colors";

interface Props {
  slide: SlideConfig;
  fullWidth: boolean;
}

const SlideContent: Component<Props> = (props) => {
  return (
    <div
      class={`slide-scroll h-full overflow-y-auto px-12 pt-16 pb-10 ${
        props.fullWidth ? "mx-auto max-w-[960px] px-16" : ""
      }`}
    >
      {/* Section badge */}
      <div class="mb-5">
        <span class={`section-badge ${badgeClass(props.slide.section)} inline-block rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide`}>
          {props.slide.section}
        </span>
      </div>

      {/* Title */}
      <h1 class="mb-10 font-display text-[2.75rem] font-bold leading-[1.15] tracking-tight text-heading">
        {props.slide.title}
      </h1>

      {/* Bullets */}
      <ul class="mb-10 space-y-5">
        <For each={props.slide.bullets}>
          {(bullet) => (
            <li class="flex items-start gap-4 font-body text-[1.1rem] leading-relaxed text-secondary">
              <span class="mt-[10px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent shadow-[0_0_6px_rgba(52,216,204,0.4)]" />
              <span>{bullet}</span>
            </li>
          )}
        </For>
      </ul>

      {/* Code snippet */}
      <Show when={props.slide.code}>
        <div class="code-block rounded-xl p-5">
          <pre class="overflow-x-auto font-mono text-[13px] leading-relaxed text-primary/90">
            <code>{props.slide.code}</code>
          </pre>
        </div>
      </Show>
    </div>
  );
};

export default SlideContent;
