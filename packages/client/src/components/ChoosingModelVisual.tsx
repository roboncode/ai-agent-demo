import type { Component } from "solid-js";
import { FiExternalLink } from "solid-icons/fi";

const TEAL = "#34d8cc";
const PURPLE = "#c084fc";

interface CategoryCardProps {
  title: string;
  color: string;
  items: Array<{ label: string; note: string }>;
}

const CategoryCard = (props: CategoryCardProps) => {
  const isTeal = () => props.color === TEAL;
  const rgba = (alpha: number) =>
    isTeal()
      ? `rgba(52,216,204,${alpha})`
      : `rgba(192,132,252,${alpha})`;

  return (
    <div
      class="rounded-xl p-5"
      style={{
        background: rgba(0.06),
        border: `1px solid ${rgba(0.18)}`,
      }}
    >
      <div
        class="mb-3 font-mono text-[12px] font-bold tracking-[0.2em]"
        style={{ color: props.color }}
      >
        {props.title}
      </div>
      <div class="space-y-2.5">
        {props.items.map((item) => (
          <div class="flex items-baseline gap-2">
            <span
              class="font-mono text-[13px]"
              style={{ color: props.color }}
            >
              ▸
            </span>
            <span class="font-mono text-[15px] text-primary">
              {item.label}
            </span>
            <span class="font-mono text-[13px] text-secondary">
              {item.note}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChoosingModelVisual: Component = () => {
  return (
    <div class="mt-6 space-y-4 text-left">
      {/* Factor Grid */}
      <div class="grid grid-cols-2 gap-3">
        <CategoryCard
          title="PERFORMANCE & COST"
          color={TEAL}
          items={[
            { label: "Cost", note: "$/million tokens" },
            { label: "Latency", note: "time to first token" },
            { label: "Throughput", note: "tokens/second" },
            { label: "Usage", note: "rate limits, quotas" },
          ]}
        />
        <CategoryCard
          title="CAPABILITIES"
          color={PURPLE}
          items={[
            { label: "Modalities", note: "text, image, audio, video" },
            { label: "Streaming", note: "SSE / WebSocket support" },
            { label: "Tool Support", note: "function calling" },
            { label: "Thinking", note: "chain-of-thought reasoning" },
          ]}
        />
        <CategoryCard
          title="MODEL CONFIGURATION"
          color={TEAL}
          items={[
            { label: "Quantized", note: "reduced precision variants" },
            { label: "Fine-tuning", note: "custom prompt training" },
            { label: "Context Window", note: "4K → 2M tokens" },
          ]}
        />
        <CategoryCard
          title="EVALUATION"
          color={PURPLE}
          items={[
            { label: "Benchmarks", note: "MMLU, HumanEval, ..." },
            { label: "Comparison", note: "head-to-head testing" },
            { label: "Open vs Closed", note: "self-host vs API" },
          ]}
        />
      </div>

      {/* Resource Links */}
      <div class="flex gap-3">
        <a
          href="https://openrouter.ai/compare/openai/gpt-4o-mini/moonshotai/kimi-k2.5/z-ai/glm-4.7-flash"
          target="_blank"
          rel="noopener noreferrer"
          class="flex flex-1 items-center gap-2.5 rounded-xl px-5 py-3.5 font-mono text-[14px] no-underline transition-opacity hover:opacity-80"
          style={{
            background: "rgba(52,216,204,0.08)",
            border: "1px solid rgba(52,216,204,0.22)",
            color: TEAL,
          }}
        >
          <FiExternalLink size={16} />
          <span class="font-semibold">Compare Models</span>
          <span
            class="ml-auto font-mono text-[12px]"
            style={{ color: "rgba(52,216,204,0.6)" }}
          >
            OpenRouter
          </span>
        </a>
        <a
          href="https://artificialanalysis.ai/"
          target="_blank"
          rel="noopener noreferrer"
          class="flex flex-1 items-center gap-2.5 rounded-xl px-5 py-3.5 font-mono text-[14px] no-underline transition-opacity hover:opacity-80"
          style={{
            background: "rgba(192,132,252,0.08)",
            border: "1px solid rgba(192,132,252,0.22)",
            color: PURPLE,
          }}
        >
          <FiExternalLink size={16} />
          <span class="font-semibold">Benchmarks & Analysis</span>
          <span
            class="ml-auto font-mono text-[12px]"
            style={{ color: "rgba(192,132,252,0.6)" }}
          >
            Artificial Analysis
          </span>
        </a>
      </div>
    </div>
  );
};

export default ChoosingModelVisual;
