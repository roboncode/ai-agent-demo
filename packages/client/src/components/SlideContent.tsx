import { type Component, For, Show, createComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { SlideConfig, DemoConfig } from "../types";
import {
  badgeClass,
  sectionAccentColor,
  sectionAccentRgb,
  sectionNumeral,
  sectionColors,
} from "../lib/section-colors";
import CodeBlock from "./CodeBlock";
import { FiChevronRight } from "solid-icons/fi";

interface Props {
  slide: SlideConfig;
  fullWidth: boolean;
  onRun?: (demo?: DemoConfig) => void;
  isRunning?: boolean;
}

/* ─── Section Intro Layout ──────────────────────────────────────── */

const SectionIntroContent: Component<{ slide: SlideConfig }> = (props) => {
  const color = () => sectionAccentColor[props.slide.section] ?? "#34d8cc";
  const rgb = () => sectionAccentRgb[props.slide.section] ?? "52,216,204";
  const numeral = () => sectionNumeral(props.slide.section);

  return (
    <div
      class="slide-scroll relative h-full overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 85% 30%, rgba(${rgb()},0.10) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 10% 80%, rgba(${rgb()},0.04) 0%, transparent 60%)
        `,
      }}
    >
      {/* Giant decorative numeral */}
      <div
        class="pointer-events-none absolute select-none font-display leading-none"
        style={{
          "font-size": "clamp(160px, 20vw, 280px)",
          "font-weight": "900",
          right: "40px",
          top: "-20px",
          color: `rgba(${rgb()},0.05)`,
          "letter-spacing": "-0.04em",
        }}
      >
        {numeral()}
      </div>

      {/* Content — left-aligned */}
      <div class="relative flex h-full flex-col justify-center px-20 py-16">
        {/* Section badge */}
        <div class="mb-8">
          <span
            class={`section-badge ${badgeClass(props.slide.section)} inline-block rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide`}
          >
            {props.slide.section}
          </span>
        </div>

        {/* Accent bar */}
        <div
          class="mb-8 h-1 w-20 rounded-full"
          style={{ background: color() }}
        />

        {/* Title — larger than normal */}
        <h1
          class="mb-4 font-display text-[3.75rem] font-bold leading-[1.1] tracking-tight text-heading"
        >
          {props.slide.title}
        </h1>

        {/* Subtitle */}
        <Show when={props.slide.subtitle}>
          <p class="mb-12 max-w-[540px] font-body text-[1.15rem] leading-relaxed text-secondary">
            {props.slide.subtitle}
          </p>
        </Show>

        {/* Numbered topic list */}
        <Show when={props.slide.bullets.length > 0}>
          <div
            class="space-y-4 rounded-2xl px-7 py-6"
            style={{
              background: `rgba(${rgb()},0.04)`,
              border: `1px solid rgba(${rgb()},0.10)`,
            }}
          >
            <For each={props.slide.bullets}>
              {(topic, i) => (
                <div class="flex items-center gap-5">
                  <span
                    class="flex-shrink-0 font-mono text-[14px] font-bold"
                    style={{ color: color(), "min-width": "28px" }}
                  >
                    {String(i() + 1).padStart(2, "0")}
                  </span>
                  <span class="font-mono text-[17px] font-medium text-primary">
                    {topic}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Bottom accent line */}
        <div
          class="mt-auto h-px w-full"
          style={{
            background: `linear-gradient(90deg, rgba(${rgb()},0.3) 0%, rgba(${rgb()},0.05) 60%, transparent 100%)`,
          }}
        />
      </div>
    </div>
  );
};

/* ─── Intro Layout ─────────────────────────────────────────────── */

const IntroContent: Component<{ slide: SlideConfig }> = (props) => {
  return (
    <div
      class="slide-scroll relative h-full overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 50% 40% at 80% 20%, rgba(52,216,204,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 40% 50% at 15% 75%, rgba(56,189,248,0.05) 0%, transparent 60%),
          radial-gradient(ellipse 30% 30% at 60% 60%, rgba(167,139,250,0.04) 0%, transparent 50%)
        `,
      }}
    >
      {/* Giant decorative "AI" text */}
      <div
        class="pointer-events-none absolute select-none font-display leading-none"
        style={{
          "font-size": "clamp(200px, 25vw, 360px)",
          "font-weight": "900",
          right: "20px",
          top: "-30px",
          color: "rgba(52,216,204,0.04)",
          "letter-spacing": "-0.04em",
        }}
      >
        AI
      </div>

      {/* Content — left-aligned */}
      <div class="relative flex h-full flex-col justify-center px-20 py-16">
        {/* Badge */}
        <div class="mb-8">
          <span
            class={`section-badge ${badgeClass(props.slide.section)} inline-block rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide`}
          >
            {props.slide.section}
          </span>
        </div>

        {/* Multi-color spectrum bar */}
        <div
          class="mb-8 h-1 w-32 rounded-full"
          style={{
            background: "linear-gradient(90deg, #34d8cc 0%, #38bdf8 20%, #a78bfa 40%, #fbbf24 60%, #fb7185 80%, #f97316 100%)",
          }}
        />

        {/* Title */}
        <h1 class="mb-4 font-display text-[4.25rem] font-bold leading-[1.05] tracking-tight text-heading">
          {props.slide.title}
        </h1>

        {/* Subtitle */}
        <Show when={props.slide.subtitle}>
          <p class="mb-14 max-w-[540px] font-body text-[1.2rem] leading-relaxed text-secondary">
            {props.slide.subtitle}
          </p>
        </Show>

        {/* Section roadmap */}
        <Show when={props.slide.bullets.length > 0}>
          <div
            class="space-y-3 rounded-2xl px-7 py-6"
            style={{
              background: "rgba(52,216,204,0.03)",
              border: "1px solid rgba(52,216,204,0.08)",
            }}
          >
            <For each={props.slide.bullets}>
              {(topic, i) => {
                const color = () => sectionColors[i()]?.[1] ?? "#34d8cc";
                return (
                  <div class="flex items-center gap-5">
                    <span
                      class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-bold"
                      style={{
                        color: color(),
                        background: `${color()}15`,
                        border: `1px solid ${color()}30`,
                      }}
                    >
                      {["I", "II", "III", "IV", "V", "VI"][i()] ?? String(i() + 1)}
                    </span>
                    <span class="font-mono text-[16px] font-medium text-primary">
                      {topic}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Bottom multi-color gradient line */}
        <div
          class="mt-auto h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, #34d8cc50 0%, #38bdf840 25%, #a78bfa30 50%, #fbbf2420 75%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
};

/* ─── Conclusion Layout ────────────────────────────────────────── */

const ConclusionContent: Component<{ slide: SlideConfig }> = (props) => {
  const rgb = "52,211,153"; // emerald
  const color = "#34d399";

  return (
    <div
      class="slide-scroll relative h-full overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 85% 30%, rgba(${rgb},0.10) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 10% 80%, rgba(${rgb},0.04) 0%, transparent 60%)
        `,
      }}
    >
      {/* Giant decorative checkmark */}
      <div
        class="pointer-events-none absolute select-none leading-none"
        style={{
          "font-size": "clamp(180px, 22vw, 320px)",
          right: "30px",
          top: "-10px",
          color: `rgba(${rgb},0.05)`,
        }}
      >
        &#10003;
      </div>

      {/* Content — left-aligned */}
      <div class="relative flex h-full flex-col justify-center px-20 py-16">
        {/* Badge */}
        <div class="mb-8">
          <span
            class={`section-badge ${badgeClass(props.slide.section)} inline-block rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide`}
          >
            {props.slide.section}
          </span>
        </div>

        {/* Accent bar */}
        <div
          class="mb-8 h-1 w-20 rounded-full"
          style={{ background: color }}
        />

        {/* Title */}
        <h1 class="mb-4 font-display text-[3.75rem] font-bold leading-[1.1] tracking-tight text-heading">
          {props.slide.title}
        </h1>

        {/* Subtitle */}
        <Show when={props.slide.subtitle}>
          <p class="mb-12 max-w-[540px] font-body text-[1.15rem] leading-relaxed text-secondary">
            {props.slide.subtitle}
          </p>
        </Show>

        {/* Key takeaways */}
        <Show when={props.slide.bullets.length > 0}>
          <div
            class="space-y-4 rounded-2xl px-7 py-6"
            style={{
              background: `rgba(${rgb},0.04)`,
              border: `1px solid rgba(${rgb},0.10)`,
            }}
          >
            <For each={props.slide.bullets}>
              {(takeaway) => (
                <div class="flex items-start gap-5">
                  <span
                    class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold"
                    style={{
                      color,
                      background: `rgba(${rgb},0.12)`,
                      border: `1px solid rgba(${rgb},0.25)`,
                    }}
                  >
                    &#10003;
                  </span>
                  <span class="font-mono text-[15px] font-medium leading-relaxed text-primary">
                    {takeaway}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Bottom accent line */}
        <div
          class="mt-auto h-px w-full"
          style={{
            background: `linear-gradient(90deg, rgba(${rgb},0.3) 0%, rgba(${rgb},0.05) 60%, transparent 100%)`,
          }}
        />
      </div>
    </div>
  );
};

/* ─── Default Slide Layout ──────────────────────────────────────── */

const DefaultSlideContent: Component<Props> = (props) => {
  return (
    <div
      class={`slide-scroll h-full overflow-y-auto ${
        props.fullWidth
          ? "flex flex-col items-center justify-center px-16 py-14"
          : "px-12 pt-14 pb-10"
      }`}
    >
      <div class={props.fullWidth ? "w-full max-w-[900px] text-center" : ""}>
        {/* Section badge */}
        <div class={props.fullWidth ? "mb-5" : "mb-5"}>
          <span
            class={`section-badge ${badgeClass(props.slide.section)} inline-block rounded-full px-4 py-1.5 font-mono text-xs font-medium tracking-wide`}
          >
            {props.slide.section}
          </span>
        </div>

        {/* Icon */}
        <Show when={props.slide.icon}>
          <div class={props.fullWidth ? "mb-6 flex justify-center" : "mb-6"}>
            <div
              class={`icon-glow inline-flex items-center justify-center rounded-2xl ${
                props.fullWidth ? "h-20 w-20" : "h-16 w-16"
              }`}
            >
              <Dynamic
                component={props.slide.icon!}
                size={props.fullWidth ? 36 : 28}
                class="text-accent"
              />
            </div>
          </div>
        </Show>

        {/* Title */}
        <h1
          class={`mb-3 font-display font-bold leading-[1.15] tracking-tight text-heading ${
            props.fullWidth ? "text-[3.25rem]" : "text-[2.5rem]"
          }`}
        >
          {props.slide.title}
        </h1>

        {/* Subtitle */}
        <Show when={props.slide.subtitle}>
          <p
            class={`mb-10 font-body text-[1.1rem] italic text-secondary ${
              props.fullWidth ? "" : ""
            }`}
          >
            {props.slide.subtitle}
          </p>
        </Show>

        {/* Bullets */}
        <Show when={props.slide.bullets.length > 0}>
          <ul
            class={`mb-10 space-y-6 ${props.fullWidth ? "mx-auto max-w-[600px]" : ""}`}
          >
            <For each={props.slide.bullets}>
              {(bullet) => (
                <li
                  class={`flex items-start gap-4 font-body text-[1.25rem] leading-relaxed text-secondary ${
                    props.fullWidth ? "justify-center text-center" : ""
                  }`}
                >
                  <Show when={!props.fullWidth}>
                    <span class="mt-[5px] flex-shrink-0 text-accent" style={{"filter": "drop-shadow(0 0 4px rgba(52,216,204,0.5))"}}>
                      <FiChevronRight size={20} />
                    </span>
                  </Show>
                  <span>{bullet}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>

        {/* Custom visual — takes priority over code block */}
        <Show when={props.slide.visual}>
          {createComponent(props.slide.visual!, {})}
        </Show>

        {/* Code snippet — only if no custom visual */}
        <Show when={props.slide.code && !props.slide.visual}>
          <div class="w-full text-left">
            <Show when={props.slide.codeLabel}>
              <p class="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-secondary">
                {props.slide.codeLabel}
              </p>
            </Show>
            <CodeBlock code={props.slide.code!} />
          </div>
        </Show>

        {/* Multiple demo buttons */}
        <Show when={props.slide.demoButtons?.length}>
          <div class="mt-8 flex w-full gap-3">
            <For each={props.slide.demoButtons}>
              {(btn) => (
                <button
                  onClick={() => props.onRun?.(btn.demo)}
                  disabled={props.isRunning}
                  class="demo-hint btn-glow flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span class="text-accent">&#9654;</span>
                  <span class="font-body text-sm text-accent-dim">{btn.label}</span>
                </button>
              )}
            </For>
          </div>
        </Show>

        {/* Single demo hint button — hidden when demoButtons is used */}
        <Show when={props.slide.demoHint && props.slide.demo && !props.slide.demoButtons?.length}>
          <button
            onClick={() => props.onRun?.()}
            disabled={props.isRunning}
            class="demo-hint btn-glow mt-8 inline-flex cursor-pointer items-center gap-3 rounded-xl px-5 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="text-lg text-accent">
              {props.isRunning ? <span class="spinner inline-block" /> : <>&#9654;</>}
            </span>
            <span class="font-body text-sm text-accent-dim">
              {props.isRunning ? "Running..." : `Watch: ${props.slide.demoHint}`}
            </span>
          </button>
        </Show>
      </div>
    </div>
  );
};

/* ─── Router ─────────────────────────────────────────────────────── */

const SlideContent: Component<Props> = (props) => {
  const layout = () => props.slide.layout;

  return (
    <Show
      when={layout() === "intro"}
      fallback={
        <Show
          when={layout() === "conclusion"}
          fallback={
            <Show
              when={layout() === "section-intro"}
              fallback={<DefaultSlideContent {...props} />}
            >
              <SectionIntroContent slide={props.slide} />
            </Show>
          }
        >
          <ConclusionContent slide={props.slide} />
        </Show>
      }
    >
      <IntroContent slide={props.slide} />
    </Show>
  );
};

export default SlideContent;
