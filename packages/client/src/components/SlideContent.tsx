import { type Component, For, Show } from "solid-js";
import type { SlideConfig } from "../types";

interface Props {
  slide: SlideConfig;
  fullWidth: boolean;
}

const SlideContent: Component<Props> = (props) => {
  return (
    <div
      class={`h-full overflow-y-auto px-12 pt-[12vh] pb-8 ${
        props.fullWidth ? "mx-auto max-w-[900px]" : ""
      }`}
    >
      {/* Category badge */}
      <div class="mb-4">
        <span class="rounded-full border border-accent-dim/30 bg-accent-glow px-3 py-1 font-mono text-xs text-accent">
          {props.slide.section}
        </span>
      </div>

      {/* Title */}
      <h1 class="mb-8 font-display text-5xl font-bold tracking-tight text-heading leading-tight">
        {props.slide.title}
      </h1>

      {/* Bullets */}
      <ul class="mb-8 space-y-4">
        <For each={props.slide.bullets}>
          {(bullet) => (
            <li class="flex items-start gap-3 font-body text-lg leading-relaxed text-secondary">
              <span class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              <span>{bullet}</span>
            </li>
          )}
        </For>
      </ul>

      {/* Code snippet */}
      <Show when={props.slide.code}>
        <div class="rounded-lg border border-border bg-terminal p-5">
          <pre class="overflow-x-auto font-mono text-sm leading-relaxed text-primary">
            <code>{props.slide.code}</code>
          </pre>
        </div>
      </Show>
    </div>
  );
};

export default SlideContent;
