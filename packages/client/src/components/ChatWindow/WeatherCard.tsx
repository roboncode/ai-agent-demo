import type { Component } from "solid-js";
import { Show, createSignal, createEffect, on } from "solid-js";

export interface WeatherData {
  location: string;
  temperature: { celsius: number; fahrenheit: number };
  feelsLike: { celsius: number; fahrenheit: number };
  humidity: number;
  description: string;
  weatherCode: number;
  windSpeed: { kmph: number; mph: number };
  uvIndex: number;
  visibility: number;
}

const ICON_BASE = "https://bmcdn.nl/assets/weather-icons/v3.0/fill/svg";

/** Blob URL cache so we only fetch/modify each icon once */
const blobCache = new Map<string, string>();

/**
 * Fetch an SVG, slow its SMIL animations by a multiplier, and return a
 * blob URL that can be used as an <img> src. This keeps the SVG fully
 * isolated from page CSS (no color inheritance issues).
 */
async function fetchSlowSvgUrl(url: string, slowFactor: number): Promise<string> {
  const key = `${url}:${slowFactor}`;
  if (blobCache.has(key)) return blobCache.get(key)!;

  const res = await fetch(url);
  let svg = await res.text();

  // Multiply all dur="..." values in SMIL animation elements
  svg = svg.replace(/dur="([\d.]+)(s?)"/g, (_match, num, unit) => {
    const newDur = parseFloat(num) * slowFactor;
    return `dur="${newDur}${unit || "s"}"`;
  });

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const blobUrl = URL.createObjectURL(blob);
  blobCache.set(key, blobUrl);
  return blobUrl;
}

/** Map WMO weather codes to Meteocons icon names */
function weatherIcon(code: number): string {
  if (code === 0) return "clear-day";
  if (code === 1) return "clear-day";
  if (code === 2) return "partly-cloudy-day";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code >= 56 && code <= 57) return "sleet";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "sleet";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "partly-cloudy-day-rain";
  if (code >= 85 && code <= 86) return "partly-cloudy-day-snow";
  if (code === 95) return "thunderstorms-rain";
  if (code >= 96 && code <= 99) return "thunderstorms-rain";
  return "partly-cloudy-day";
}

/** Pick accent colors based on weather conditions */
function conditionAccent(code: number): { bg: string; glow: string; border: string; statBg: string } {
  if (code === 0 || code === 1) return {
    bg: "from-amber-500/[0.12] via-orange-400/[0.06] to-sky-400/[0.08]",
    glow: "rgba(251, 191, 36, 0.12)",
    border: "border-amber-400/[0.15]",
    statBg: "rgba(251, 191, 36, 0.08)",
  };
  if (code === 2) return {
    bg: "from-sky-400/[0.10] via-blue-400/[0.06] to-slate-400/[0.07]",
    glow: "rgba(56, 189, 248, 0.10)",
    border: "border-sky-400/[0.14]",
    statBg: "rgba(56, 189, 248, 0.07)",
  };
  if (code === 3) return {
    bg: "from-slate-400/[0.10] via-gray-400/[0.06] to-slate-500/[0.07]",
    glow: "rgba(148, 163, 184, 0.08)",
    border: "border-slate-400/[0.14]",
    statBg: "rgba(148, 163, 184, 0.06)",
  };
  if (code >= 51 && code <= 67) return {
    bg: "from-blue-400/[0.12] via-indigo-400/[0.06] to-slate-400/[0.08]",
    glow: "rgba(96, 165, 250, 0.12)",
    border: "border-blue-400/[0.15]",
    statBg: "rgba(96, 165, 250, 0.07)",
  };
  if (code >= 71 && code <= 86) return {
    bg: "from-slate-300/[0.12] via-blue-300/[0.06] to-indigo-300/[0.08]",
    glow: "rgba(203, 213, 225, 0.08)",
    border: "border-slate-300/[0.14]",
    statBg: "rgba(203, 213, 225, 0.06)",
  };
  if (code >= 95) return {
    bg: "from-violet-400/[0.12] via-indigo-500/[0.07] to-slate-500/[0.08]",
    glow: "rgba(167, 139, 250, 0.12)",
    border: "border-violet-400/[0.15]",
    statBg: "rgba(167, 139, 250, 0.07)",
  };
  return {
    bg: "from-sky-400/[0.10] via-blue-400/[0.06] to-indigo-400/[0.07]",
    glow: "rgba(56, 189, 248, 0.08)",
    border: "border-sky-400/[0.14]",
    statBg: "rgba(56, 189, 248, 0.06)",
  };
}

/** Image component that renders an SVG with slowed SMIL animations via blob URL */
const SlowIcon: Component<{ url: string; size: number; slow?: number; alt?: string; class?: string; style?: string }> = (props) => {
  const [src, setSrc] = createSignal("");

  createEffect(on(() => props.url, (url) => {
    fetchSlowSvgUrl(url, props.slow ?? 2).then((blobUrl) => setSrc(blobUrl));
  }));

  return (
    <Show when={src()} fallback={
      <div class={props.class ?? ""} style={`width: ${props.size}px; height: ${props.size}px; ${props.style ?? ""}`} />
    }>
      <img
        src={src()}
        alt={props.alt ?? ""}
        width={props.size}
        height={props.size}
        class={props.class ?? ""}
        style={`width: ${props.size}px; height: ${props.size}px; ${props.style ?? ""}`}
      />
    </Show>
  );
};

interface Props {
  data: WeatherData;
}

const WeatherCard: Component<Props> = (props) => {
  const accent = () => conditionAccent(props.data.weatherCode);
  const iconUrl = () => `${ICON_BASE}/${weatherIcon(props.data.weatherCode)}.svg`;

  return (
    <div
      class={`weather-card relative my-3 overflow-hidden rounded-2xl border ${accent().border} bg-gradient-to-br ${accent().bg}`}
      style={`box-shadow: 0 4px 32px ${accent().glow}, 0 0 0 1px rgba(255,255,255,0.04) inset; backdrop-filter: blur(12px)`}
    >
      {/* Ambient backdrop icon — oversized, bleeds off edge, slowed */}
      <SlowIcon
        url={iconUrl()}
        size={220}
        slow={2.5}
        alt=""
        class="pointer-events-none absolute -right-8 -top-6 select-none"
        style="opacity: 0.2; filter: blur(0.5px)"
      />

      {/* Main content */}
      <div class="relative z-10 flex items-start justify-between px-6 pt-6 pb-2">
        <div class="flex-1 min-w-0">
          {/* Location */}
          <div class="font-body text-[15px] font-semibold text-white/80 leading-tight pr-16">
            {props.data.location}
          </div>

          {/* Hero temperature */}
          <div class="mt-2 flex items-baseline gap-2.5">
            <span class="font-display text-[56px] font-bold leading-[0.9] tracking-tight text-white">
              {props.data.temperature.fahrenheit}°
            </span>
            <span class="font-mono text-[16px] font-medium text-white/40 leading-tight">
              {props.data.temperature.celsius}°C
            </span>
          </div>

          {/* Condition description */}
          <div class="mt-2.5 font-body text-[15px] text-white/70 leading-snug">
            {props.data.description}
            <Show when={props.data.feelsLike.fahrenheit !== props.data.temperature.fahrenheit}>
              <span class="text-white/40"> · Feels like {props.data.feelsLike.fahrenheit}°</span>
            </Show>
          </div>
        </div>

        {/* Foreground icon — slowed animation */}
        <SlowIcon
          url={iconUrl()}
          size={96}
          slow={2}
          alt={props.data.description}
          class="flex-shrink-0"
          style="margin-top: -4px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35))"
        />
      </div>

      {/* Divider */}
      <div class="relative z-10 mx-6 border-t border-white/[0.06]" />

      {/* Stats row */}
      <div class="relative z-10 grid grid-cols-3 gap-2.5 px-6 py-4">
        {/* Humidity */}
        <div
          class="flex flex-col items-center gap-1 rounded-xl px-3 py-3 border border-white/[0.08]"
          style={`background: ${accent().statBg}`}
        >
          <img src={`${ICON_BASE}/raindrop.svg`} alt="" width="26" height="26" />
          <span class="font-mono text-[16px] font-bold text-white/95">{props.data.humidity}%</span>
          <span class="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">Humidity</span>
        </div>

        {/* Wind */}
        <div
          class="flex flex-col items-center gap-1 rounded-xl px-3 py-3 border border-white/[0.08]"
          style={`background: ${accent().statBg}`}
        >
          <img src={`${ICON_BASE}/wind.svg`} alt="" width="26" height="26" />
          <span class="font-mono text-[16px] font-bold text-white/95">{props.data.windSpeed.mph} mph</span>
          <span class="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">Wind</span>
        </div>

        {/* UV Index */}
        <div
          class="flex flex-col items-center gap-1 rounded-xl px-3 py-3 border border-white/[0.08]"
          style={`background: ${accent().statBg}`}
        >
          <img src={`${ICON_BASE}/uv-index.svg`} alt="" width="26" height="26" />
          <span class="font-mono text-[16px] font-bold text-white/95">{props.data.uvIndex}</span>
          <span class="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">UV Index</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
