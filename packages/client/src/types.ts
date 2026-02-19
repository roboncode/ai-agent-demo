import type { Component } from "solid-js";
import type { IconTypes } from "solid-icons";

export type TerminalLineType =
  | "text"
  | "tool-call"
  | "tool-result"
  | "status"
  | "done"
  | "error"
  | "info"
  | "success"
  | "warning"
  | "system-prompt"
  | "user-prompt";

export interface TerminalLine {
  id: string;
  type: TerminalLineType;
  content: string;
}

export type DemoType = "json" | "sse" | "multi-step" | "delete";

export interface JsonDemoConfig {
  type: "json";
  endpoint: string;
  method?: "GET" | "POST";
  body: Record<string, unknown>;
  systemPrompt?: string;
  /** Render the response `text` field as formatted text instead of raw JSON */
  displayAs?: "text";
  /** Steps for multi-request JSON demos (e.g. auth with 3 attempts) */
  steps?: Array<{
    label: string;
    headers?: Record<string, string>;
    body: Record<string, unknown>;
    skipAuth?: boolean;
  }>;
}

export interface SseDemoConfig {
  type: "sse";
  endpoint: string;
  body: Record<string, unknown>;
  systemPrompt?: string;
  /** Sequential SSE steps — each opens a separate stream */
  steps?: Array<{
    label: string;
    body: Record<string, unknown>;
  }>;
}

export interface MultiStepDemoConfig {
  type: "multi-step";
  /** Phase 1: propose */
  proposeEndpoint: string;
  proposeBody: Record<string, unknown>;
  /** Phase 2: approve/reject */
  approveEndpoint: string;
  /** Field in phase 1 response that contains the action ID */
  actionIdPath: string;
  systemPrompt?: string;
}

export interface DeleteDemoConfig {
  type: "delete";
  endpoint: string;
  /** Optional message shown in terminal before the request */
  label?: string;
}

export type DemoConfig = JsonDemoConfig | SseDemoConfig | MultiStepDemoConfig | DeleteDemoConfig;

export interface SlideConfig {
  id: number;
  title: string;
  subtitle?: string;
  icon?: IconTypes;
  /** Optional custom visual component rendered below bullets, replaces code block */
  visual?: Component;
  category: string;
  section: string;
  bullets: string[];
  /** Render as a special layout slide */
  layout?: "section-intro" | "intro" | "conclusion";
  demoHint?: string;
  /** Multiple labelled demo buttons — rendered instead of the single demoHint button */
  demoButtons?: Array<{ label: string; demo: DemoConfig }>;
  /** Optional label shown above the code block */
  codeLabel?: string;
  /** Optional code snippet to display */
  code?: string;
  /** Optional demo configuration - slides without this hide the terminal */
  demo?: DemoConfig;
}
