import { type Component, For } from "solid-js";
import { FiChevronLeft, FiChevronRight, FiCommand } from "solid-icons/fi";

interface Props {
  total: number;
  current: number;
  onNavigate: (index: number) => void;
  onShowShortcuts: () => void;
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

      <div class="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => props.onNavigate(props.current - 1)}
          disabled={props.current === 0}
          class="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:text-primary disabled:opacity-30"
          title="Previous slide (←)"
        >
          <FiChevronLeft size={15} />
        </button>

        {/* Next */}
        <button
          onClick={() => props.onNavigate(props.current + 1)}
          disabled={props.current === props.total - 1}
          class="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:text-primary disabled:opacity-30"
          title="Next slide (→)"
        >
          <FiChevronRight size={15} />
        </button>

        {/* Divider */}
        <div class="mx-1 h-3.5 w-px bg-border-subtle" />

        {/* Shortcuts */}
        <button
          onClick={props.onShowShortcuts}
          title="Keyboard shortcuts (?)"
          class="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:text-primary hover:shadow-[0_0_8px_rgba(52,216,204,0.15)]"
        >
          <FiCommand size={14} />
        </button>
      </div>
    </div>
  );
};

export default SlideNav;
