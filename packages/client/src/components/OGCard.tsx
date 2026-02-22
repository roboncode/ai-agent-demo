import { Show } from "solid-js";
import type { Component } from "solid-js";

interface OGData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  siteName: string | null;
  type: string | null;
}

interface Props {
  data: string;
}

const OGCard: Component<Props> = (props) => {
  const og = (): OGData => {
    try {
      return JSON.parse(props.data);
    } catch {
      return { title: null, description: null, image: null, url: "", siteName: null, type: null };
    }
  };

  return (
    <div class="my-3 max-w-md overflow-hidden rounded-lg border border-border bg-raised">
      <Show when={og().image}>
        <div class="h-40 w-full overflow-hidden">
          <img
            src={og().image!}
            alt={og().title ?? ""}
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </Show>

      <div class="p-4">
        <Show when={og().siteName}>
          <span class="mb-1 inline-block rounded-sm bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
            {og().siteName}
          </span>
        </Show>

        <Show when={og().title}>
          <div class="font-mono text-[14px] font-semibold text-heading leading-snug">
            {og().title}
          </div>
        </Show>

        <Show when={og().description}>
          <div class="mt-1.5 font-mono text-[12px] leading-relaxed text-secondary line-clamp-3">
            {og().description}
          </div>
        </Show>

        <Show when={og().url}>
          <a
            href={og().url}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 block truncate font-mono text-[11px] text-accent-dim hover:text-accent transition-colors"
          >
            {og().url}
          </a>
        </Show>
      </div>
    </div>
  );
};

export default OGCard;
