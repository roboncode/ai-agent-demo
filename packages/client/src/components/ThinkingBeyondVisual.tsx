import type { Component } from "solid-js";
import { FiUsers, FiClock, FiBookOpen, FiPlay } from "solid-icons/fi";

const ACCENT = "#34d8cc";
const ACCENT_RGB = "52,216,204";

const cards = [
  {
    icon: FiUsers,
    title: "Think assistant, not software",
    desc: "What would you train a new hire to handle on day one?",
  },
  {
    icon: FiClock,
    title: "Find the time sinks",
    desc: "Which repetitive tasks quietly eat hours every week?",
  },
  {
    icon: FiBookOpen,
    title: "Define the knowledge",
    desc: "What skills and data does your assistant need to be useful?",
  },
  {
    icon: FiPlay,
    title: "Automate one thing first",
    desc: "Pick the workflow you never have time for -- start there.",
  },
];

const ThinkingBeyondVisual: Component = () => {
  return (
    <div class="mt-6 grid grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <div
          class="group relative overflow-hidden rounded-2xl p-6 text-left transition-all"
          style={{
            background: `linear-gradient(145deg, rgba(${ACCENT_RGB},${0.07 + i * 0.01}) 0%, rgba(${ACCENT_RGB},0.02) 100%)`,
            border: `1px solid rgba(${ACCENT_RGB},0.14)`,
          }}
        >
          {/* Icon */}
          <div
            class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: `rgba(${ACCENT_RGB},0.10)`,
              border: `1px solid rgba(${ACCENT_RGB},0.20)`,
              "box-shadow": `0 0 20px rgba(${ACCENT_RGB},0.08)`,
            }}
          >
            <card.icon size={20} color={ACCENT} />
          </div>

          {/* Title */}
          <h3 class="mb-2 font-display text-[17px] font-bold leading-snug text-heading">
            {card.title}
          </h3>

          {/* Description */}
          <p class="font-body text-[14px] leading-relaxed text-secondary">
            {card.desc}
          </p>

          {/* Subtle corner glow */}
          <div
            class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${ACCENT_RGB},0.10) 0%, transparent 70%)`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default ThinkingBeyondVisual;
