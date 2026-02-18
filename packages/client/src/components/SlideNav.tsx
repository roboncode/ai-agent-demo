import { type Component, For } from "solid-js";

interface Props {
  total: number;
  current: number;
  onNavigate: (index: number) => void;
}

const SlideNav: Component<Props> = (props) => {
  return (
    <div class="bottom-nav relative z-10 flex h-11 items-center justify-between px-8">
      <span class="font-mono text-[11px] tabular-nums text-muted">
        {String(props.current + 1).padStart(2, "0")} / {String(props.total).padStart(2, "0")}
      </span>

      <div class="flex items-center gap-1.5">
        <For each={Array.from({ length: props.total })}>
          {(_, i) => (
            <button
              onClick={() => props.onNavigate(i())}
              class={`rounded-full transition-all duration-200 ${
                i() === props.current
                  ? "h-2.5 w-7 bg-accent shadow-[0_0_8px_rgba(52,216,204,0.3)]"
                  : "h-2 w-2 bg-muted/30 hover:bg-muted/60"
              }`}
            />
          )}
        </For>
      </div>

      <div class="flex items-center gap-1.5 font-mono text-[11px] text-muted">
        <kbd class="rounded border border-border-subtle bg-raised/50 px-1.5 py-0.5 text-[10px]">←</kbd>
        <kbd class="rounded border border-border-subtle bg-raised/50 px-1.5 py-0.5 text-[10px]">→</kbd>
      </div>
    </div>
  );
};

export default SlideNav;
