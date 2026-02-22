import { Show } from "solid-js";
import type { Component } from "solid-js";
import { FiArrowUpRight } from "solid-icons/fi";

export interface LinkCardData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  siteName: string | null;
}

interface Props {
  data: LinkCardData;
}

const LinkCard: Component<Props> = (props) => {
  const hostname = () => {
    try { return new URL(props.data.url).hostname.replace(/^www\./, ""); } catch { return props.data.url; }
  };

  return (
    <a
      href={props.data.url}
      target="_blank"
      rel="noopener noreferrer"
      class="group my-3 block overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.04] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
    >
      <Show when={props.data.image}>
        <div class="relative h-36 w-full overflow-hidden">
          <img
            src={props.data.image!}
            alt={props.data.title ?? ""}
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
          {/* Gradient scrim for readability */}
          <div class="absolute inset-0 bg-gradient-to-t from-[#08080d] via-[#08080d]/40 to-transparent" />
          {/* Site name badge overlaid on image */}
          <Show when={props.data.siteName}>
            <span class="absolute bottom-3 left-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
              {props.data.siteName}
            </span>
          </Show>
        </div>
      </Show>

      <div class="px-4 py-3.5">
        {/* Site name fallback when no image */}
        <Show when={!props.data.image && props.data.siteName}>
          <span class="mb-1.5 inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent/60">
            {props.data.siteName}
          </span>
        </Show>

        <Show when={props.data.title}>
          <div class="font-body text-[15px] font-semibold text-heading leading-snug">
            {props.data.title}
          </div>
        </Show>

        <Show when={props.data.description}>
          <div class="mt-1.5 font-body text-[13px] leading-relaxed text-secondary line-clamp-2">
            {props.data.description}
          </div>
        </Show>

        <div class="mt-2.5 flex items-center gap-1.5 text-muted/60 transition-colors group-hover:text-accent/70">
          <span class="truncate font-mono text-[12px]">{hostname()}</span>
          <FiArrowUpRight size={13} class="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </a>
  );
};

export default LinkCard;
