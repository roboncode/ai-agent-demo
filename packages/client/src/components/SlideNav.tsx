import { type Component, For } from "solid-js";

interface Props {
  total: number;
  current: number;
  onNavigate: (index: number) => void;
}

const SlideNav: Component<Props> = (props) => {
  return (
    <div class="flex h-10 items-center justify-between border-t border-border bg-root px-6">
      <span class="font-mono text-xs text-muted">
        {props.current + 1} / {props.total}
      </span>

      <div class="flex items-center gap-1.5">
        <For each={Array.from({ length: props.total })}>
          {(_, i) => (
            <button
              onClick={() => props.onNavigate(i())}
              class={`h-2 rounded-full transition-all ${
                i() === props.current
                  ? "w-6 bg-accent"
                  : "w-2 bg-muted/40 hover:bg-muted"
              }`}
            />
          )}
        </For>
      </div>

      <span class="font-mono text-xs text-muted">
        <kbd class="rounded border border-border px-1.5 py-0.5">←</kbd>{" "}
        <kbd class="rounded border border-border px-1.5 py-0.5">→</kbd>
      </span>
    </div>
  );
};

export default SlideNav;
