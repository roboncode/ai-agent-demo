import type { Component } from "solid-js";
import { FiSearch, FiBarChart2, FiMessageCircle, FiRefreshCw } from "solid-icons/fi";

const ROSE = "#fb7185";
const ROSE_RGB = "251,113,133";
const AMBER = "#fbbf24";
const AMBER_RGB = "251,191,36";
const EMERALD = "#34d399";
const EMERALD_RGB = "52,211,153";
const CYAN = "#22d3ee";
const CYAN_RGB = "34,211,238";

const steps = [
  {
    icon: FiSearch,
    label: "Test",
    desc: "Run prompts against known inputs",
    color: ROSE,
    rgb: ROSE_RGB,
  },
  {
    icon: FiBarChart2,
    label: "Measure",
    desc: "Score accuracy, latency, cost",
    color: AMBER,
    rgb: AMBER_RGB,
  },
  {
    icon: FiMessageCircle,
    label: "Feedback",
    desc: "Collect user corrections & flags",
    color: CYAN,
    rgb: CYAN_RGB,
  },
  {
    icon: FiRefreshCw,
    label: "Iterate",
    desc: "Refine prompts, tools, guardrails",
    color: EMERALD,
    rgb: EMERALD_RGB,
  },
];

const EvaluationFeedbackVisual: Component = () => {
  return (
    <div class="mt-4 flex items-start gap-5 text-left">
      {/* ── Loop diagram ──────────────────────────────────────── */}
      <div
        class="relative flex-shrink-0 overflow-hidden rounded-2xl p-5"
        style={{
          background: `linear-gradient(140deg, rgba(${ROSE_RGB},0.07) 0%, rgba(${ROSE_RGB},0.02) 100%)`,
          border: `1px solid rgba(${ROSE_RGB},0.16)`,
          "min-width": "210px",
        }}
      >
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: `rgba(${ROSE_RGB},0.11)`,
              border: `1px solid rgba(${ROSE_RGB},0.26)`,
              color: ROSE,
            }}
          >
            EVAL LOOP
          </span>
        </div>

        <div>
          {steps.map((step, i) => (
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-center">
                <div
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `rgba(${step.rgb}, 0.12)`,
                    border: `1px solid rgba(${step.rgb}, 0.3)`,
                  }}
                >
                  <step.icon size={14} color={step.color} />
                </div>
                {i < steps.length - 1 && (
                  <div class="flex flex-col items-center">
                    <div
                      class="h-3.5 w-px"
                      style={{ background: `rgba(${step.rgb}, 0.25)` }}
                    />
                    <svg width="8" height="6" viewBox="0 0 8 6" class="mt-[-1px]">
                      <path d="M4 6L0 0h8z" fill={`rgba(${step.rgb}, 0.35)`} />
                    </svg>
                  </div>
                )}
                {i === steps.length - 1 && (
                  <div class="flex flex-col items-center">
                    <div
                      class="h-3 w-px"
                      style={{ background: `rgba(${step.rgb}, 0.2)` }}
                    />
                    <svg width="20" height="14" viewBox="0 0 20 14">
                      <path
                        d="M10 14C10 14 1 14 1 7C1 0 10 0 10 0"
                        fill="none"
                        stroke={`rgba(${ROSE_RGB}, 0.25)`}
                        stroke-width="1"
                        stroke-dasharray="2 2"
                      />
                      <path d="M8 0L12 0L10 -3z" fill={`rgba(${ROSE_RGB}, 0.3)`} transform="translate(0, 3)" />
                    </svg>
                    <span class="mt-0.5 font-mono text-[9px]" style={{ color: `rgba(${ROSE_RGB}, 0.5)` }}>repeat</span>
                  </div>
                )}
              </div>
              <div class="mb-3">
                <div
                  class="font-mono text-[14px] font-semibold"
                  style={{ color: step.color }}
                >
                  {step.label}
                </div>
                <div class="font-mono text-[12px] text-secondary">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── What to measure ───────────────────────────────────── */}
      <div class="flex flex-1 flex-col gap-2.5 pt-1">
        {[
          {
            color: ROSE_RGB,
            title: "Eval datasets",
            body: "Golden Q&A pairs with expected answers -- run on every prompt change",
          },
          {
            color: AMBER_RGB,
            title: "Scoring metrics",
            body: "Accuracy, hallucination rate, tool-call success, latency P95, cost per query",
          },
          {
            color: CYAN_RGB,
            title: "User signals",
            body: "Thumbs up/down, corrections, escalations -- the data your eval set can't capture",
          },
          {
            color: EMERALD_RGB,
            title: "A/B testing",
            body: "Run prompt variants side-by-side -- measure which actually performs better",
          },
        ].map((point) => (
          <div
            class="rounded-xl px-5 py-3"
            style={{
              background: `rgba(${point.color}, 0.05)`,
              border: `1px solid rgba(${point.color}, 0.15)`,
            }}
          >
            <div
              class="mb-0.5 font-mono text-[13px] font-semibold"
              style={{ color: `rgb(${point.color})` }}
            >
              {point.title}
            </div>
            <div class="font-mono text-[12px] leading-relaxed text-secondary">
              {point.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvaluationFeedbackVisual;
