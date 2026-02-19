import type { Component } from "solid-js";

const TEAL = "#34d8cc";

const takeaways = [
  "An LLM is just a prediction engine — tools turn it into an agent",
  "Patterns like memory, guardrails, and retries make agents reliable",
  "Orchestration lets multiple agents collaborate and parallelize",
  "Production demands auth, injection defense, cost tracking, and observability",
  "Start simple, measure everything, add complexity only when you need it",
];

const ClosingVisual: Component = () => {
  return (
    <div class="mt-6 text-left">
      <div
        class="rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(52,216,204,0.09) 0%, rgba(52,216,204,0.03) 100%)",
          border: "1px solid rgba(52,216,204,0.22)",
          "box-shadow": "0 0 28px rgba(52,216,204,0.06)",
        }}
      >
        <div class="space-y-4">
          {takeaways.map((t) => (
            <div class="flex items-start gap-3">
              <span
                class="mt-0.5 flex-shrink-0 font-mono text-[16px]"
                style={{ color: TEAL }}
              >
                ✓
              </span>
              <span class="font-mono text-[15px] leading-relaxed text-primary">
                {t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClosingVisual;
