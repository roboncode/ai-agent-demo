import type { LanguageModel } from "ai";
import type { MiddlewareHandler } from "hono";
import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AgentRegistry } from "./registry/agent-registry.js";
import type { ToolRegistry } from "./registry/tool-registry.js";
import type { VoiceManager } from "./voice/voice-manager.js";
import type { CardRegistry } from "./lib/card-registry.js";
import type { StorageProvider } from "./storage/interfaces.js";

export interface AIPluginConfig {
  /** Returns a LanguageModel for the given model ID (or default) */
  getModel: (id?: string) => LanguageModel;
  /** Storage provider (use createFileStorage() for file-based) */
  storage: StorageProvider;
  /** Optional auth middleware applied to all routes */
  authMiddleware?: MiddlewareHandler;
  /** Voice configuration (omit to disable voice routes) */
  voice?: VoiceConfig;
  /** Maximum delegation nesting depth (default: 3) */
  maxDelegationDepth?: number;
  /** Default max AI SDK steps per agent call (default: 5) */
  defaultMaxSteps?: number;
  /** OpenAPI doc metadata */
  openapi?: {
    title?: string;
    version?: string;
    description?: string;
    serverUrl?: string;
  };
}

export interface VoiceConfig {
  /** Whether to retain audio files server-side */
  retainAudio?: boolean;
}

export interface AIPluginInstance {
  /** The Hono sub-app to mount with app.route("/ai", plugin.app) */
  app: OpenAPIHono;
  /** Agent registry — register your agents here */
  agents: AgentRegistry;
  /** Tool registry — register your tools here */
  tools: ToolRegistry;
  /** Card extractor registry — register UI card extractors here */
  cards: CardRegistry;
  /** Voice manager (undefined if voice not configured) */
  voice?: VoiceManager;
  /** Load prompt overrides and finalize setup */
  initialize(): Promise<void>;
}
