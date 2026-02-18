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

export type DemoType = "json" | "sse" | "multi-step";

export interface JsonDemoConfig {
  type: "json";
  endpoint: string;
  method?: "GET" | "POST";
  body: Record<string, unknown>;
  systemPrompt?: string;
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

export type DemoConfig = JsonDemoConfig | SseDemoConfig | MultiStepDemoConfig;

export interface SlideConfig {
  id: number;
  title: string;
  category: string;
  section: string;
  bullets: string[];
  /** Optional code snippet to display */
  code?: string;
  /** Optional demo configuration - slides without this hide the terminal */
  demo?: DemoConfig;
}
