import type { Component } from "solid-js";
import { FiArrowRight } from "solid-icons/fi";

const METRIC_COLOR = "#34d8cc";
const WARN_COLOR = "#f59e0b";

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
}

const StatRow = (props: StatRowProps) => (
  <div class="flex items-center justify-between">
    <span class="font-mono text-[13px] text-secondary">{props.label}</span>
    <span
      class="font-mono text-[14px] font-semibold"
      style={{ color: props.color ?? METRIC_COLOR }}
    >
      {props.value}
    </span>
  </div>
);

const Slide17Visual: Component = () => {
  return (
    <div class="mt-8 flex items-stretch gap-4 text-left">
      {/* ── Single Agent Call ─────────────────────────────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-7"
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
              color: METRIC_COLOR,
            }}
          >
            SINGLE AGENT
          </span>
        </div>

        <p class="mb-5 font-mono text-[16px] text-primary">one LLM call</p>

        <div
          class="space-y-3.5 rounded-xl px-5 py-4"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <StatRow label="input tokens" value="612" />
          <StatRow label="output tokens" value="231" />
          <div class="h-px" style={{ background: "rgba(52,216,204,0.15)" }} />
          <StatRow label="total tokens" value="843" />
          <StatRow label="duration" value="2.1s" />
          <StatRow label="cost" value="$0.00021" />
        </div>

        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(52,216,204,0.14) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Connector ─────────────────────────────────────────── */}
      <div class="flex flex-shrink-0 items-center justify-center px-2">
        <FiArrowRight size={36} class="text-secondary" />
      </div>

      {/* ── Multi-Agent Pipeline ──────────────────────────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(245,158,11,0.09) 0%, rgba(245,158,11,0.03) 100%)",
          border: "1px solid rgba(245,158,11,0.22)",
          "box-shadow": "0 0 28px rgba(245,158,11,0.06)",
        }}
      >
        <div class="mb-4 flex flex-col gap-1.5">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(245,158,11,0.13)",
              border: "1px solid rgba(245,158,11,0.28)",
              color: WARN_COLOR,
            }}
          >
            SUPERVISOR
          </span>
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: WARN_COLOR,
              opacity: "0.85",
            }}
          >
            + 3 AGENTS
          </span>
        </div>

        <p class="mb-5 font-mono text-[16px] text-primary">
          4 LLM calls{" "}
          <span
            class="ml-1 rounded-md px-2 py-0.5 font-mono text-[12px] font-bold"
            style={{
              background: "rgba(245,158,11,0.18)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: WARN_COLOR,
            }}
          >
            ×4 cost
          </span>
        </p>

        <div
          class="space-y-3.5 rounded-xl px-5 py-4"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <StatRow label="input tokens" value="2,448" color={WARN_COLOR} />
          <StatRow label="output tokens" value="924" color={WARN_COLOR} />
          <div class="h-px" style={{ background: "rgba(245,158,11,0.15)" }} />
          <StatRow label="total tokens" value="3,372" color={WARN_COLOR} />
          <StatRow label="duration" value="4.8s" color={WARN_COLOR} />
          <StatRow label="cost" value="$0.00084" color={WARN_COLOR} />
        </div>

        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
};

export default Slide17Visual;
