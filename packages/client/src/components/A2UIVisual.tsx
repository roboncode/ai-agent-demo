import type { Component } from "solid-js";

const ACCENT = "#34d8cc";
const ROSE = "#fb7185";
const AMBER = "#fbbf24";

const steps = [
  {
    num: "1",
    label: "Agent returns structured data",
    detail: '{ title, description, image, url }',
    color: ACCENT,
  },
  {
    num: "2",
    label: "Client receives JSON over SSE",
    detail: "event: tool-result \u2192 og-card",
    color: AMBER,
  },
  {
    num: "3",
    label: "Native component renders",
    detail: "<OGCard /> \u2014 no HTML from the agent",
    color: ROSE,
  },
];

const A2UIVisual: Component = () => {
  return (
    <div class="mt-8 text-left">
      {steps.map((s, i) => (
        <div class="flex gap-5">
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
            {i < steps.length - 1 && (
              <div
                class="my-1 w-px flex-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>

          <div class="pb-5 pt-1.5">
            <div class="font-mono text-[16px] font-semibold text-primary">
              {s.label}
            </div>
            <div class="mt-0.5 font-mono text-[13px] text-secondary">
              {s.detail}
            </div>
          </div>
        </div>
      ))}

      <div class="mt-2 rounded border border-border-subtle px-3 py-2">
        <div class="font-mono text-[12px] text-muted">
          No executable code crosses the trust boundary — only declarative data.
        </div>
      </div>
    </div>
  );
};

export default A2UIVisual;
