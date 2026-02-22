import type { Component } from "solid-js";
import { FiGlobe, FiCloud, FiZap, FiCpu } from "solid-icons/fi";

const ROSE = "#fb7185";
const ROSE_RGB = "251,113,133";
const SKY = "#38bdf8";
const SKY_RGB = "56,189,248";
const AMBER = "#fbbf24";
const AMBER_RGB = "251,191,36";
const VIOLET = "#a78bfa";
const VIOLET_RGB = "167,139,250";

const targets = [
  {
    icon: FiGlobe,
    label: "Edge",
    desc: "Close to users, minimal latency",
    color: ROSE,
    rgb: ROSE_RGB,
    specs: [
      { key: "Latency", val: "< 50ms" },
      { key: "Best for", val: "Classification, routing" },
      { key: "Trade-off", val: "Small model sizes only" },
    ],
  },
  {
    icon: FiCloud,
    label: "Cloud",
    desc: "Full power, centralized inference",
    color: SKY,
    rgb: SKY_RGB,
    specs: [
      { key: "Latency", val: "100-500ms" },
      { key: "Best for", val: "Complex reasoning, tools" },
      { key: "Trade-off", val: "Higher cost, region-bound" },
    ],
  },
  {
    icon: FiZap,
    label: "Serverless",
    desc: "Scale to zero, pay per call",
    color: AMBER,
    rgb: AMBER_RGB,
    specs: [
      { key: "Latency", val: "Cold start + inference" },
      { key: "Best for", val: "Bursty, low-traffic agents" },
      { key: "Trade-off", val: "Cold starts, timeout limits" },
    ],
  },
  {
    icon: FiCpu,
    label: "GPU / Dedicated",
    desc: "Self-hosted models, full control",
    color: VIOLET,
    rgb: VIOLET_RGB,
    specs: [
      { key: "Latency", val: "Lowest (no network hop)" },
      { key: "Best for", val: "Privacy, custom fine-tunes" },
      { key: "Trade-off", val: "Ops burden, GPU cost" },
    ],
  },
];

const DeploymentScalingVisual: Component = () => {
  return (
    <div class="mt-4 grid grid-cols-2 gap-3 text-left">
      {targets.map((target) => (
        <div
          class="relative overflow-hidden rounded-xl p-4"
          style={{
            background: `linear-gradient(145deg, rgba(${target.rgb},0.07) 0%, rgba(${target.rgb},0.02) 100%)`,
            border: `1px solid rgba(${target.rgb},0.14)`,
          }}
        >
          {/* Header */}
          <div class="mb-3 flex items-center gap-2.5">
            <div
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                background: `rgba(${target.rgb}, 0.12)`,
                border: `1px solid rgba(${target.rgb}, 0.25)`,
              }}
            >
              <target.icon size={15} color={target.color} />
            </div>
            <div>
              <div class="font-mono text-[14px] font-bold" style={{ color: target.color }}>
                {target.label}
              </div>
              <div class="font-mono text-[11px] text-secondary">{target.desc}</div>
            </div>
          </div>

          {/* Specs */}
          <div
            class="space-y-2 rounded-lg px-3.5 py-2.5"
            style={{ background: "rgba(0,0,0,0.25)" }}
          >
            {target.specs.map((spec) => (
              <div class="flex items-baseline justify-between gap-3">
                <span class="flex-shrink-0 font-mono text-[11px] text-muted">{spec.key}</span>
                <span class="font-mono text-[11px] text-primary text-right">{spec.val}</span>
              </div>
            ))}
          </div>

          {/* Corner glow */}
          <div
            class="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${target.rgb},0.10) 0%, transparent 70%)`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default DeploymentScalingVisual;
