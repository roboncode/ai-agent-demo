import type { Component, JSXElement } from "solid-js";
import { FiCommand, FiX, FiPlus, FiChevronLeft, FiChevronRight } from "solid-icons/fi";

interface Props {
  onClose: () => void;
}

const isMac = navigator.platform.toUpperCase().includes("MAC");
const mod = isMac ? "⌘" : "Ctrl";

const shortcuts: { keys: JSXElement[]; label: string }[] = [
  { keys: [<FiChevronLeft size={13} />, <FiChevronRight size={13} />], label: "Navigate slides" },
  { keys: ["Space"],            label: "Next slide" },
  { keys: [mod, "Shift", "K"], label: "Clear terminal" },
  { keys: ["S"],                label: "Toggle SSE / WS mode" },
  { keys: ["?"],                label: "Show shortcuts" },
  { keys: ["Esc"],              label: "Close this panel" },
];

const Key = (props: { children: JSXElement }) => (
  <span class="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-white/20 bg-white/10 px-2 py-1 font-mono text-[11px] font-semibold leading-none text-primary shadow-[inset_0_-1px_0_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.06)]">
    {props.children}
  </span>
);

const ShortcutsHelp: Component<Props> = (props) => {
  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-end p-6 pb-16"
      onClick={props.onClose}
    >
      <div
        class="shortcuts-card w-80 overflow-hidden rounded-2xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-2.5">
            <span class="text-accent">
              <FiCommand size={15} />
            </span>
            <span class="font-mono text-[11px] font-bold tracking-[0.12em] text-heading uppercase">
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={props.onClose}
            class="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/8 hover:text-primary"
            aria-label="Close"
          >
            <FiX size={13} />
          </button>
        </div>

        {/* Divider */}
        <div class="h-px bg-white/8" />

        {/* Shortcuts list */}
        <ul class="px-3 py-3 space-y-0.5">
          {shortcuts.map((s) => (
            <li class="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/4">
              <span class="font-body text-[13px] text-secondary">{s.label}</span>
              <div class="flex items-center gap-1.5">
                {s.keys.map((key, i) => (
                  <>
                    {i > 0 && (
                      <span class="text-muted">
                        <FiPlus size={9} />
                      </span>
                    )}
                    <Key>{key}</Key>
                  </>
                ))}
              </div>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div class="px-5 pb-4 pt-1">
          <p class="font-mono text-[10px] text-muted">
            Press <span class="text-secondary">Esc</span> or click outside to dismiss
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsHelp;
