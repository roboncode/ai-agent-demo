import type { Component } from "solid-js";

// Colors intentionally mirror the terminal line types:
// system-prompt → text-ansi-magenta (#c084fc)
// user-prompt   → text-ansi-cyan    (#22d3ee)

const SYSTEM_COLOR = "#c084fc";
const USER_COLOR = "#22d3ee";

const PromptsVisual: Component = () => {
  return (
    <div class="mt-8 flex items-stretch gap-4 text-left">
      {/* ── System Prompt ─────────────────────────────────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(192,132,252,0.09) 0%, rgba(192,132,252,0.03) 100%)",
          border: "1px solid rgba(192,132,252,0.22)",
          "box-shadow": "0 0 28px rgba(192,132,252,0.06)",
        }}
      >
        {/* Role chip */}
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(192,132,252,0.13)",
              border: "1px solid rgba(192,132,252,0.28)",
              color: SYSTEM_COLOR,
            }}
          >
            SYSTEM PROMPT
          </span>
        </div>

        {/* Definition */}
        <p class="mb-5 font-mono text-[16px] text-muted">
          who the agent is
        </p>

        {/* Example */}
        <div
          class="rounded-xl px-5 py-4 font-mono text-[14px] leading-[2]"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <span style={{ color: SYSTEM_COLOR }}>"You are a </span>
          <span class="text-heading">weather specialist</span>
          <span style={{ color: SYSTEM_COLOR }}>.</span>
          <br />
          <span style={{ color: SYSTEM_COLOR }}>
            &nbsp;Use your tools. Be concise."
          </span>
        </div>

        {/* Corner glow */}
        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(192,132,252,0.14) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Connector ─────────────────────────────────────────── */}
      <div class="flex flex-col items-center justify-center gap-1.5 px-1">
        <div class="h-px w-4 bg-border" />
        <span class="font-mono text-[13px] text-muted">+</span>
        <div class="h-px w-4 bg-border" />
      </div>

      {/* ── User Prompt ───────────────────────────────────────── */}
      <div
        class="relative flex-1 overflow-hidden rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(34,211,238,0.09) 0%, rgba(34,211,238,0.03) 100%)",
          border: "1px solid rgba(34,211,238,0.22)",
          "box-shadow": "0 0 28px rgba(34,211,238,0.06)",
        }}
      >
        {/* Role chip */}
        <div class="mb-4">
          <span
            class="inline-block rounded-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-[0.18em]"
            style={{
              background: "rgba(34,211,238,0.11)",
              border: "1px solid rgba(34,211,238,0.26)",
              color: USER_COLOR,
            }}
          >
            USER PROMPT
          </span>
        </div>

        {/* Definition */}
        <p class="mb-5 font-mono text-[16px] text-muted">
          what to do
        </p>

        {/* Example */}
        <div
          class="rounded-xl px-5 py-4 font-mono text-[14px] leading-[2]"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <span style={{ color: USER_COLOR }}>"What is the weather</span>
          <br />
          <span style={{ color: USER_COLOR }}>&nbsp;like in </span>
          <span class="text-heading">Tokyo</span>
          <span style={{ color: USER_COLOR }}> right now?"</span>
        </div>

        {/* Corner glow */}
        <div
          class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.14) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
};

export default PromptsVisual;
