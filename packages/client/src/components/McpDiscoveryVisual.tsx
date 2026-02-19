import type { Component } from "solid-js";

const ACCENT = "#34d8cc";
const PURPLE = "#c084fc";

interface ToolChipProps {
  name: string;
  desc: string;
}

const ToolChip = (props: ToolChipProps) => (
  <div
    class="rounded-xl px-5 py-3.5"
    style={{
      background: "rgba(52,216,204,0.07)",
      border: "1px solid rgba(52,216,204,0.2)",
    }}
  >
    <div class="font-mono text-[14px] font-semibold" style={{ color: ACCENT }}>
      {props.name}
    </div>
    <div class="mt-1 font-mono text-[13px] text-secondary">{props.desc}</div>
  </div>
);

const Slide18Visual: Component = () => {
  return (
    <div class="mt-8 flex items-center gap-5 text-left">
      {/* ── Your Agent ────────────────────────────────────────── */}
      <div
        class="relative w-[200px] flex-shrink-0 overflow-hidden rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(192,132,252,0.09) 0%, rgba(192,132,252,0.03) 100%)",
          border: "1px solid rgba(192,132,252,0.22)",
          "box-shadow": "0 0 28px rgba(192,132,252,0.06)",
        }}
      >
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(192,132,252,0.13)",
              border: "1px solid rgba(192,132,252,0.28)",
              color: PURPLE,
            }}
          >
            YOUR AGENT
          </span>
        </div>
        <p class="font-mono text-[14px] text-secondary leading-relaxed">
          asks MCP:
        </p>
        <p class="mt-1 font-mono text-[14px] text-primary leading-relaxed">
          "what tools<br />can I use?"
        </p>
        <div
          class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(192,132,252,0.14) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── MCP Protocol bridge ───────────────────────────────── */}
      <div class="flex flex-1 flex-col items-center gap-3">
        {/* Arrow right */}
        <div class="flex w-full items-center gap-2">
          <div class="h-px flex-1" style={{ background: "rgba(52,216,204,0.35)" }} />
          <span class="font-mono text-[12px]" style={{ color: ACCENT }}>▶</span>
        </div>

        {/* MCP box */}
        <div
          class="w-full rounded-xl px-5 py-4 text-center"
          style={{
            background: "rgba(52,216,204,0.1)",
            border: "1px solid rgba(52,216,204,0.3)",
          }}
        >
          <div class="font-mono text-[13px] font-bold tracking-[0.2em]" style={{ color: ACCENT }}>
            MCP PROTOCOL
          </div>
          <div class="mt-1.5 font-mono text-[12px] text-secondary">standard discovery</div>
        </div>

        {/* Arrow right */}
        <div class="flex w-full items-center gap-2">
          <div class="h-px flex-1" style={{ background: "rgba(52,216,204,0.35)" }} />
          <span class="font-mono text-[12px]" style={{ color: ACCENT }}>▶</span>
        </div>
      </div>

      {/* ── Tool Servers ──────────────────────────────────────── */}
      <div class="flex flex-1 flex-col gap-3">
        <ToolChip name="search" desc="web search" />
        <ToolChip name="calendar" desc="schedule events" />
        <ToolChip name="database" desc="query records" />
        <ToolChip name="any tool..." desc="plug and play" />
      </div>
    </div>
  );
};

export default Slide18Visual;
