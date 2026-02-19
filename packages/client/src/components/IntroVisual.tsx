import type { Component } from "solid-js";

const TEAL = "#34d8cc";
const SKY = "#38bdf8";
const VIOLET = "#a78bfa";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";

const sections = [
  { num: "I", title: "Foundations", desc: "LLMs, prompts, and streaming", color: TEAL },
  { num: "II", title: "From LLM to Agent", desc: "Tools, decisions, and knowledge", color: SKY },
  { num: "III", title: "Agent Patterns", desc: "Memory, guardrails, error handling", color: VIOLET },
  { num: "IV", title: "Orchestration", desc: "Supervisors and parallel tasks", color: AMBER },
  { num: "V", title: "Production", desc: "Security, cost, and deployment", color: ROSE },
];

const IntroVisual: Component = () => {
  return (
    <div class="mt-8 text-left">
      {sections.map((s, i) => (
        <div class="flex gap-5">
          {/* Timeline column */}
          <div class="flex flex-col items-center">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-mono text-[14px] font-bold"
              style={{
                background: `${s.color}18`,
                border: `1.5px solid ${s.color}50`,
                color: s.color,
              }}
            >
              {s.num}
            </div>
            {i < sections.length - 1 && (
              <div
                class="my-1 w-px flex-1"
                style={{ background: `rgba(255,255,255,0.08)` }}
              />
            )}
          </div>

          {/* Content */}
          <div class="pb-5 pt-1.5">
            <div class="font-mono text-[16px] font-semibold text-primary">
              {s.title}
            </div>
            <div class="mt-0.5 font-mono text-[13px] text-secondary">
              {s.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IntroVisual;
