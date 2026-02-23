import type { Component } from "solid-js";
import { FiTool } from "solid-icons/fi";

interface Props {
  toolName: string;
}

const ToolCallBadge: Component<Props> = (props) => {
  return (
    <div class="my-1.5 flex items-center gap-2">
      <div class="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 border border-white/[0.06]">
        <FiTool size={12} class="text-amber-400/70" />
        <span class="font-mono text-[11px] text-secondary">{props.toolName}</span>
        <span class="spinner !h-2.5 !w-2.5 !border-[1.5px] !border-white/10 !border-t-amber-400/60" />
      </div>
    </div>
  );
};

export default ToolCallBadge;
