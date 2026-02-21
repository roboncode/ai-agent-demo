import type { Context } from "hono";
import type { z } from "zod";

export type AgentHandler = (
  c: Context,
  options: { systemPrompt: string; memoryContext?: string },
) => Response | Promise<Response>;

export interface SubRouteRegistration {
  subPath: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  summary: string;
  description: string;
  type: "stream" | "json";
  handler: (c: Context) => Response | Promise<Response>;
  requestSchema?: z.ZodType<any>;
}

export interface AgentRegistration {
  name: string;
  description: string;
  tags?: string[];
  toolNames: string[];
  type: "stream" | "json" | "hybrid";
  defaultSystem: string;
  handler: AgentHandler;
  subRoutes?: SubRouteRegistration[];
}

class AgentRegistry {
  private agents = new Map<string, AgentRegistration>();
  private promptOverrides = new Map<string, string>();

  register(registration: AgentRegistration) {
    this.agents.set(registration.name, registration);
  }

  get(name: string): AgentRegistration | undefined {
    return this.agents.get(name);
  }

  list(): AgentRegistration[] {
    return [...this.agents.values()];
  }

  getResolvedPrompt(name: string): string | undefined {
    const agent = this.agents.get(name);
    if (!agent) return undefined;
    return this.promptOverrides.get(name) ?? agent.defaultSystem;
  }

  setPromptOverride(name: string, prompt: string) {
    this.promptOverrides.set(name, prompt);
  }

  resetPrompt(name: string) {
    this.promptOverrides.delete(name);
  }

  hasPromptOverride(name: string): boolean {
    return this.promptOverrides.has(name);
  }

  loadPromptOverrides(overrides: Record<string, string>) {
    for (const [name, prompt] of Object.entries(overrides)) {
      this.promptOverrides.set(name, prompt);
    }
  }
}

export const agentRegistry = new AgentRegistry();
