import type { Component } from "solid-js";

// Generalist AI (amber) vs Custom Agent (teal/accent)
const GENERIC_COLOR = "#f59e0b";
const CUSTOM_COLOR = "#34d8cc";

const Slide14Visual: Component = () => {
  return (
    <div class="mt-8 flex items-stretch gap-4 text-left">
      {/* ── Generalist AI ─────────────────────────────────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(245,158,11,0.09) 0%, rgba(245,158,11,0.03) 100%)",
          border: "1px solid rgba(245,158,11,0.22)",
          "box-shadow": "0 0 28px rgba(245,158,11,0.06)",
        }}
      >
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(245,158,11,0.13)",
              border: "1px solid rgba(245,158,11,0.28)",
              color: GENERIC_COLOR,
            }}
          >
            GENERALIST AI
          </span>
        </div>

        <p class="mb-5 font-mono text-[16px] text-secondary">knows everything, nothing deeply</p>

        <div
          class="space-y-2.5 rounded-xl px-5 py-4 font-mono text-[13px] leading-relaxed"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          {[
            "✦ one model for every domain",
            "✦ no access to your private data",
            "✦ no domain-specific tools",
            "✦ no guardrails for your use case",
          ].map((item) => (
            <div style={{ color: GENERIC_COLOR }}>{item}</div>
          ))}
        </div>

        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Connector ─────────────────────────────────────────── */}
      <div class="flex flex-col items-center justify-center gap-1.5 px-1">
        <div class="h-px w-4 bg-border" />
        <span class="font-mono text-[13px] text-secondary">vs</span>
        <div class="h-px w-4 bg-border" />
      </div>

      {/* ── Custom Agent ──────────────────────────────────────── */}
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
              background: "rgba(52,216,204,0.11)",
              border: "1px solid rgba(52,216,204,0.26)",
              color: CUSTOM_COLOR,
            }}
          >
            YOUR CUSTOM AGENT
          </span>
        </div>

        <p class="mb-5 font-mono text-[16px] text-secondary">purpose-built, fully controlled</p>

        <div
          class="space-y-2.5 rounded-xl px-5 py-4 font-mono text-[13px] leading-relaxed"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          {[
            "✦ right model for the job",
            "✦ your private data as context",
            "✦ domain-specific tools",
            "✦ guardrails you define",
          ].map((item) => (
            <div style={{ color: CUSTOM_COLOR }}>{item}</div>
          ))}
        </div>

        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(52,216,204,0.14) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
};

export default Slide14Visual;
