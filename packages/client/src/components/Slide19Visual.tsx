import type { Component } from "solid-js";

interface StepProps {
  label: string;
  desc: string;
  color: string;
  isLast?: boolean;
}

const Step = (props: StepProps) => (
  <div class="flex items-center gap-3">
    <div class="flex flex-col items-center">
      <div
        class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold"
        style={{
          background: `rgba(${props.color}, 0.12)`,
          border: `1px solid rgba(${props.color}, 0.3)`,
          color: `rgba(${props.color}, 1)`,
        }}
      >
        {props.label.slice(0, 2).toUpperCase()}
      </div>
      {!props.isLast && (
        <div
          class="mt-0.5 h-4 w-px"
          style={{ background: `rgba(${props.color}, 0.25)` }}
        />
      )}
    </div>
    <div class="mb-3">
      <div
        class="font-mono text-[14px] font-semibold"
        style={{ color: `rgba(${props.color}, 1)` }}
      >
        {props.label}
      </div>
      <div class="font-mono text-[13px] text-secondary">{props.desc}</div>
    </div>
  </div>
);

const STEPS = [
  { label: "Input",        desc: "user message arrives",      color: "228,228,236" },
  { label: "Guardrail",    desc: "classify & filter",         color: "248,113,113" },
  { label: "Supervisor",   desc: "route to specialists",      color: "192,132,252" },
  { label: "Parallel",     desc: "weather · news · movies",   color: "52,216,204"  },
  { label: "Synthesize",   desc: "structured output",         color: "34,211,238"  },
  { label: "Human Review", desc: "approve or reject",         color: "245,158,11"  },
  { label: "Execute",      desc: "action taken",              color: "74,222,128"  },
];

const Slide19Visual: Component = () => {
  return (
    <div class="mt-4 flex items-start gap-6 text-left">
      {/* ── Pipeline ──────────────────────────────────────────── */}
      <div
        class="relative flex-shrink-0 overflow-hidden rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(140deg, rgba(52,216,204,0.07) 0%, rgba(52,216,204,0.02) 100%)",
          border: "1px solid rgba(52,216,204,0.16)",
          "box-shadow": "0 0 24px rgba(52,216,204,0.05)",
          "min-width": "240px",
        }}
      >
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(52,216,204,0.11)",
              border: "1px solid rgba(52,216,204,0.26)",
              color: "#34d8cc",
            }}
          >
            AGENT WORKFLOW
          </span>
        </div>
        <div>
          {STEPS.map((s, i) => (
            <Step {...s} isLast={i === STEPS.length - 1} />
          ))}
        </div>
      </div>

      {/* ── Key Points ────────────────────────────────────────── */}
      <div class="flex flex-1 flex-col gap-2.5 pt-1">
        {[
          {
            color: "248,113,113",
            title: "Guardrails first",
            body: "block off-topic requests before spending any compute",
          },
          {
            color: "192,132,252",
            title: "Smart routing",
            body: "supervisor picks the right specialist — or many at once",
          },
          {
            color: "52,216,204",
            title: "Parallel execution",
            body: "independent tasks run simultaneously, not in a queue",
          },
          {
            color: "245,158,11",
            title: "Human in the loop",
            body: "risky actions pause for approval before executing",
          },
        ].map((point) => (
          <div
            class="rounded-xl px-5 py-3.5"
            style={{
              background: `rgba(${point.color}, 0.06)`,
              border: `1px solid rgba(${point.color}, 0.18)`,
            }}
          >
            <div
              class="mb-1 font-mono text-[14px] font-semibold"
              style={{ color: `rgba(${point.color}, 1)` }}
            >
              {point.title}
            </div>
            <div class="font-mono text-[13px] text-secondary leading-relaxed">
              {point.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Slide19Visual;
