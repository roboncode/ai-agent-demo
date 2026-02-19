import type { Component } from "solid-js";

const TEAL = "#34d8cc";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const PURPLE = "#c084fc";

interface BarProps {
  pct: number;
  label: string;
  status: string;
  color: string;
  bgAlpha: string;
}

const DegradationBar = (props: BarProps) => (
  <div>
    <div class="mb-1.5 flex justify-between">
      <span class="font-mono text-[11px]" style={{ color: props.color }}>
        {props.label}
      </span>
      <span class="font-mono text-[11px]" style={{ color: props.color }}>
        {props.status}
      </span>
    </div>
    <div class="h-3 rounded-full" style={{ background: props.bgAlpha }}>
      <div
        class="h-full rounded-full transition-all"
        style={{ width: `${props.pct}%`, background: props.color }}
      />
    </div>
  </div>
);

const ContextIntelligenceVisual: Component = () => {
  return (
    <div class="mt-6 flex items-stretch gap-4 text-left">
      {/* ── Left: Token Intelligence Degradation ───────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(140deg, rgba(52,216,204,0.09) 0%, rgba(52,216,204,0.03) 100%)",
          border: "1px solid rgba(52,216,204,0.22)",
          "box-shadow": "0 0 28px rgba(52,216,204,0.06)",
        }}
      >
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(52,216,204,0.13)",
              border: "1px solid rgba(52,216,204,0.28)",
              color: TEAL,
            }}
          >
            TOKEN INTELLIGENCE
          </span>
        </div>

        <p class="mb-5 font-mono text-[14px] text-secondary">
          more tokens → less accuracy
        </p>

        <div
          class="space-y-4 rounded-xl px-5 py-4"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <DegradationBar
            pct={20}
            label="20% context"
            status="high accuracy"
            color={TEAL}
            bgAlpha="rgba(52,216,204,0.12)"
          />
          <DegradationBar
            pct={70}
            label="70% context"
            status="degraded"
            color={AMBER}
            bgAlpha="rgba(245,158,11,0.12)"
          />
          <DegradationBar
            pct={100}
            label="100% context"
            status="hallucinations"
            color={RED}
            bgAlpha="rgba(239,68,68,0.12)"
          />
        </div>

        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(52,216,204,0.14) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Right: Compaction Strategies ────────────────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(140deg, rgba(192,132,252,0.09) 0%, rgba(192,132,252,0.03) 100%)",
          border: "1px solid rgba(192,132,252,0.22)",
          "box-shadow": "0 0 28px rgba(192,132,252,0.06)",
        }}
      >
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(192,132,252,0.13)",
              border: "1px solid rgba(192,132,252,0.28)",
              color: PURPLE,
            }}
          >
            COMPACTION
          </span>
        </div>

        {/* When */}
        <div class="mb-5">
          <p
            class="mb-2 font-mono text-[13px] font-semibold"
            style={{ color: AMBER }}
          >
            WHEN TO COMPACT
          </p>
          <div
            class="space-y-2 rounded-xl px-4 py-3"
            style={{ background: "rgba(0,0,0,0.28)" }}
          >
            {[
              "Token count nears context limit",
              "Response quality drops noticeably",
              "Older context losing relevance",
            ].map((item) => (
              <div class="font-mono text-[13px] text-secondary">
                <span style={{ color: AMBER }}>▸ </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* How */}
        <div>
          <p
            class="mb-2 font-mono text-[13px] font-semibold"
            style={{ color: TEAL }}
          >
            HOW TO COMPACT
          </p>
          <div
            class="space-y-2 rounded-xl px-4 py-3"
            style={{ background: "rgba(0,0,0,0.28)" }}
          >
            {[
              "Summarize older messages",
              "Sliding window + summary prefix",
              "Priority-based retention",
              "Hierarchical compression",
            ].map((item) => (
              <div class="font-mono text-[13px] text-secondary">
                <span style={{ color: TEAL }}>▸ </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(192,132,252,0.14) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
};

export default ContextIntelligenceVisual;
