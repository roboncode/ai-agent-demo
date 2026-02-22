import { generateText, streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { getModel, extractUsage, extractStreamUsage, mergeUsage, type UsageInfo } from "../lib/ai-provider.js";
import { executeTask } from "./execute-task.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { generateConversationId } from "../registry/handler-factories.js";
import { getOrchestratorAgents, getEventBus } from "../lib/delegation-context.js";
import type { AgentEventBus } from "../lib/agent-events.js";

const DEFAULT_SYSTEM_PROMPT = `You are a supervisor agent that routes user queries to the appropriate specialist agent.

When you receive a query:
1. Analyze what the user is asking about
2. Consider if any available skills would improve the response quality
3. For simple, single-domain queries: use routeToAgent to delegate immediately
4. For complex, multi-domain queries: use createTask for each sub-task (they will run in parallel)
5. Synthesize the results into a coherent response

Guidelines for choosing between routeToAgent and createTask:
- Use routeToAgent when the query maps to a single agent or when tasks must be sequential
- Use createTask when the query spans multiple independent domains that can run in parallel
- You can mix both in a single response if needed

Guidelines for skill selection:
- Only attach skills when they clearly match the user's intent or phrasing
- A query like "explain simply" or "ELI5" should trigger the eli5 skill
- A query like "give me a summary" or "TLDR" should trigger the concise-summarizer skill
- Don't attach skills when they would not meaningfully change the response
- You may attach multiple skills if they complement each other

Always use the routing tools - never answer domain questions directly.`;

export interface SupervisorAgentConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  /** Explicit list of agent names to route to (omit for auto-discovery) */
  agents?: string[];
  /** Whether the supervisor operates autonomously (default true) */
  autonomous?: boolean;
}

// ── Serialized stream writer ────────────────────────────────────
// All SSE writes (both from the supervisor and from bus events)
// go through this so they never race.

interface StreamWriter {
  write(event: string, data: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}

function createStreamWriter(stream: { writeSSE: (msg: any) => Promise<void> }): StreamWriter {
  let id = 0;
  let chain = Promise.resolve();

  return {
    write(event: string, data: Record<string, unknown>) {
      const p = chain.then(() =>
        stream.writeSSE({
          id: String(id++),
          event,
          data: JSON.stringify(data),
        }),
      );
      chain = p.catch(() => {}); // keep chain alive on error
      return p;
    },
    flush() {
      return chain;
    },
  };
}

/** Subscribe to bus and forward sub-agent events to the stream.
 *  Returns an unsubscribe function. */
function bridgeBusToStream(bus: AgentEventBus | undefined, writer: StreamWriter): () => void {
  if (!bus) return () => {};

  // These events are forwarded from sub-agents via the bus.
  // The supervisor writes its own lifecycle events directly.
  const forwarded = new Set([
    "delegate:start",
    "delegate:end",
    "tool:call",
    "tool:result",
  ]);

  return bus.subscribe((event) => {
    if (forwarded.has(event.type)) {
      writer.write(event.type, event.data);
    }
  });
}

// ── Agent helpers ───────────────────────────────────────────────

function getRoutableAgents(allowedAgents?: string[]) {
  const orchestrators = getOrchestratorAgents();
  return agentRegistry.list().filter((a) => {
    if (orchestrators.has(a.name)) return false;
    if (!a.tools || Object.keys(a.tools).length === 0) return false;
    if (allowedAgents) return allowedAgents.includes(a.name);
    return true;
  });
}

function buildRoutingTool(allowedAgents?: string[]) {
  const agents = getRoutableAgents(allowedAgents);
  if (agents.length === 0) {
    throw new Error("No routable agents available");
  }
  const agentNames = agents.map((a) => a.name) as [string, ...string[]];

  return tool({
    description:
      "Route a query to a specialist agent for immediate execution. Use for single-domain queries or sequential tasks.",
    inputSchema: z.object({
      agent: z.enum(agentNames).describe("The specialist agent to route to"),
      query: z.string().describe("The query to send to the agent"),
      skills: z.array(z.string()).optional().describe("Skill names to activate for this agent (e.g. ['eli5', 'concise-summarizer'])"),
    }),
    execute: async ({ agent, query, skills }) => {
      const result = await executeTask(agent, query, skills);
      return result.result;
    },
  });
}

function buildCreateTaskTool(allowedAgents?: string[]) {
  const agents = getRoutableAgents(allowedAgents);
  if (agents.length === 0) {
    throw new Error("No routable agents available");
  }
  const agentNames = agents.map((a) => a.name) as [string, ...string[]];

  return tool({
    description:
      "Create a sub-task to be delegated to a specialist agent. Tasks are collected and executed in parallel. Use for multi-domain queries.",
    inputSchema: z.object({
      agent: z.enum(agentNames).describe("The specialist agent to handle this task"),
      query: z.string().describe("The specific query for this task"),
      skills: z.array(z.string()).optional().describe("Skill names to activate for this agent (e.g. ['eli5', 'concise-summarizer'])"),
    }),
    // No execute — deferred for parallel batching
  });
}

async function buildSystemPrompt(basePrompt: string, allowedAgents?: string[]) {
  const agents = getRoutableAgents(allowedAgents);
  const agentList = agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");

  console.log(`[supervisor] Routable agents (${agents.length}):`, agents.map((a) => a.name));

  let prompt = `${basePrompt}\n\nAvailable agents:\n${agentList}`;

  // Append skill summaries so the supervisor knows what skills exist
  const { getSkillSummaries } = await import("../storage/skill-store.js");
  const skillSummaries = await getSkillSummaries();
  prompt += `\n\nAvailable skills (pass skill names in the "skills" parameter when routing):\n${skillSummaries}`;

  return prompt;
}

/** Extract createTask calls from generateText steps */
function collectTasksFromSteps(steps: any[]): { agent: string; query: string; skills?: string[] }[] {
  const tasks: { agent: string; query: string; skills?: string[] }[] = [];
  for (const step of steps) {
    for (const tc of step.toolCalls) {
      if (tc.toolName === "createTask" && (tc as any).input) {
        const input = (tc as any).input as { agent?: string; query?: string; skills?: string[] };
        if (input.agent && input.query) {
          tasks.push({ agent: input.agent, query: input.query, skills: input.skills });
        }
      }
    }
  }
  return tasks;
}

// ── JSON handler (non-streaming) ────────────────────────────────

export async function runSupervisorAgent(message: string, model?: string, allowedAgents?: string[], autonomous = true) {
  const startTime = performance.now();
  const routeToAgentTool = buildRoutingTool(allowedAgents);
  const createTaskTool = buildCreateTaskTool(allowedAgents);
  const system = await buildSystemPrompt(DEFAULT_SYSTEM_PROMPT, allowedAgents);

  const result = await generateText({
    model: getModel(model),
    system,
    prompt: message,
    tools: { routeToAgent: routeToAgentTool, createTask: createTaskTool },
    stopWhen: stepCountIs(5),
  });

  // Reactive clarification check (direct routeToAgent path)
  if (!autonomous) {
    for (const step of result.steps) {
      for (const tr of step.toolResults) {
        if (tr.toolName === "routeToAgent") {
          const output = (tr as any).output;
          if (output?.items?.length) {
            const supervisorUsage = extractUsage(result, startTime);
            const subAgentUsage = output?.usage as UsageInfo | undefined;
            const totalUsage = subAgentUsage
              ? mergeUsage(supervisorUsage, subAgentUsage)
              : supervisorUsage;
            return {
              response: output.response ?? "",
              awaitingResponse: true,
              items: output.items,
              toolsUsed: ["routeToAgent"],
              agentsUsed: [] as string[],
              usage: totalUsage,
            };
          }
        }
      }
    }
  }

  // Check if any createTask calls were made (deferred tasks)
  const tasks = collectTasksFromSteps(result.steps);

  if (tasks.length > 0) {
    const results = await Promise.all(
      tasks.map((task) => executeTask(task.agent, task.query, task.skills))
    );

    // Check if any task needs clarification (parallel path)
    if (!autonomous) {
      const needsClarification = results.filter(r => r.result.items?.length);
      if (needsClarification.length > 0) {
        const allItems = needsClarification.flatMap(r =>
          r.result.items?.map((item) => ({ ...item, agent: r.agent })) ?? []
        );
        const supervisorUsage = extractUsage(result, startTime);
        const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
        return {
          response: "",
          awaitingResponse: true,
          items: allItems,
          toolsUsed: ["createTask"],
          agentsUsed: needsClarification.map(r => r.agent),
          usage: mergeUsage(supervisorUsage, ...subAgentUsages),
        };
      }
    }

    const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

    const synthesisStart = performance.now();
    const synthesisResult = await generateText({
      model: getModel(model),
      prompt: synthesisPrompt,
    });
    const synthUsage = extractUsage(synthesisResult, synthesisStart);

    const supervisorUsage = extractUsage(result, startTime);
    const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
    const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
    const agentsUsed = results.map((r) => r.agent);

    return {
      response: synthesisResult.text,
      toolsUsed: [...new Set(allToolsUsed)],
      agentsUsed: [...new Set(agentsUsed)],
      tasks: results.map((r) => ({
        agent: r.agent,
        query: r.query,
        summary: r.result.response.slice(0, 200),
      })),
      usage: mergeUsage(supervisorUsage, ...subAgentUsages, synthUsage),
    };
  }

  // Direct routeToAgent path — sub-agent usage is in tool results
  const supervisorUsage = extractUsage(result, startTime);
  const routeResultUsages = result.steps
    .flatMap((step) => step.toolResults)
    .filter((tr) => tr.toolName === "routeToAgent")
    .map((tr) => (tr as any).output?.usage)
    .filter((u): u is UsageInfo => !!u);

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName);

  const agentsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => (tc as any).input)
    .filter((input): input is { agent: string; query: string } => !!input?.agent)
    .map((args) => args.agent);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
    agentsUsed: [...new Set(agentsUsed)],
    usage: routeResultUsages.length > 0
      ? mergeUsage(supervisorUsage, ...routeResultUsages)
      : supervisorUsage,
  };
}

// ── SSE handler (streaming) ─────────────────────────────────────

function buildSseHandler(allowedAgents?: string[], defaultAutonomous = true) {
  return async (c: Context, { systemPrompt, memoryContext }: { systemPrompt: string; memoryContext?: string }) => {
    const body = await c.req.json();
    const {
      message,
      conversationId: cid,
      model,
      planMode,
      approvedPlan,
      autonomous: reqAutonomous,
    } = body;
    const convId = generateConversationId(cid);
    const autonomous = reqAutonomous ?? defaultAutonomous;
    const overallStart = performance.now();

    let system = await buildSystemPrompt(systemPrompt, allowedAgents);
    if (memoryContext) {
      system += `\n\n## Memory Context\n${memoryContext}`;
    }

    // ── approvedPlan shortcut ─────────────────────────────────
    if (approvedPlan && Array.isArray(approvedPlan) && approvedPlan.length > 0) {
      return streamSSE(c, async (stream) => {
        const writer = createStreamWriter(stream);
        const bus = getEventBus();
        const unsub = bridgeBusToStream(bus, writer);

        await writer.write("agent:start", { agent: "supervisor" });

        // Execute approved tasks in parallel — bus events stream in real-time
        const results = await Promise.all(
          approvedPlan.map((task: { agent: string; query: string; skills?: string[] }) => executeTask(task.agent, task.query, task.skills))
        );

        // Flush any queued bus events before continuing
        await writer.flush();

        // Synthesis
        await writer.write("agent:think", { text: "Synthesizing results..." });

        const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

        const synthesisStart = performance.now();
        const synthesisResult = streamText({ model: getModel(model), prompt: synthesisPrompt });

        for await (const text of synthesisResult.textStream) {
          await writer.write("text-delta", { text });
        }

        const synthesisUsage = await synthesisResult.usage;
        const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
        const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
        const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
        const totalUsage = mergeUsage(...subAgentUsages, synthUsageInfo);
        totalUsage.durationMs = Math.round(performance.now() - overallStart);

        await writer.write("agent:end", { agent: "supervisor" });

        await writer.write("done", {
          toolsUsed: [...new Set(allToolsUsed)],
          conversationId: convId,
          tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })),
          usage: totalUsage,
        });

        unsub();
      });
    }

    // ── Build tools based on mode ─────────────────────────────
    const tools: Record<string, any> = {};

    if (planMode) {
      tools.createTask = buildCreateTaskTool(allowedAgents);
    } else {
      tools.routeToAgent = buildRoutingTool(allowedAgents);
      tools.createTask = buildCreateTaskTool(allowedAgents);
    }

    return streamSSE(c, async (stream) => {
      const writer = createStreamWriter(stream);
      const bus = getEventBus();
      const unsub = bridgeBusToStream(bus, writer);

      await writer.write("agent:start", { agent: "supervisor" });

      // ── Routing phase ───────────────────────────────────────
      // For routeToAgent (with execute), the SDK runs executeTask inline,
      // which emits delegate:start/end + tool:call/result to the bus → stream.
      // Sub-agents have _clarify injected — if they need info, they call it
      // and we detect it reactively (no pre-routing triage needed).
      const planStart = performance.now();
      const planResult = await generateText({
        model: getModel(model),
        system,
        prompt: message,
        tools,
        stopWhen: stepCountIs(5),
      });
      const planUsage = extractUsage(planResult, planStart);

      // Flush any bus events from inline routeToAgent executions
      await writer.flush();

      // ── Reactive clarification check (direct routeToAgent) ─
      // If a sub-agent called _clarify, its result contains
      // typed items. Detect and surface to user.
      if (!autonomous) {
        for (const step of planResult.steps) {
          for (const tr of step.toolResults) {
            if (tr.toolName === "routeToAgent") {
              const output = (tr as any).output;
              if (output?.items?.length) {
                const agent = planResult.steps
                  .flatMap((s) => s.toolCalls)
                  .find((tc) => tc.toolName === "routeToAgent")?.input?.agent;
                const taggedItems = output.items.map((item: any) => ({ ...item, agent }));
                await writer.write("ask:user", { items: taggedItems });
                await writer.write("agent:end", { agent: "supervisor" });

                // Include sub-agent usage from the inline routeToAgent execution
                const subAgentUsage = output?.usage as UsageInfo | undefined;
                const totalUsage = subAgentUsage
                  ? mergeUsage(planUsage, subAgentUsage)
                  : { ...planUsage };
                totalUsage.durationMs = Math.round(performance.now() - overallStart);

                await writer.write("done", {
                  toolsUsed: ["routeToAgent"],
                  conversationId: convId,
                  awaitingResponse: true,
                  items: taggedItems,
                  usage: totalUsage,
                });
                unsub();
                return;
              }
            }
          }
        }
      }

      // ── deferred createTask calls ───────────────────────────
      const tasks = collectTasksFromSteps(planResult.steps);

      if (tasks.length > 0) {
        await writer.write("agent:plan", { tasks });

        // Non-autonomous: pause for approval
        if (!autonomous) {
          await writer.write("agent:end", { agent: "supervisor" });
          await writer.write("done", {
            toolsUsed: ["createTask"],
            conversationId: convId,
            awaitingApproval: true,
            tasks,
            usage: { ...planUsage, durationMs: Math.round(performance.now() - overallStart) },
          });
          unsub();
          return;
        }

        // Phase 2: Execute all tasks in parallel — bus events stream in real-time
        const results = await Promise.all(
          tasks.map((task) => executeTask(task.agent, task.query, task.skills))
        );
        await writer.flush();

        // Phase 3: Synthesis
        await writer.write("agent:think", { text: "Synthesizing results..." });

        const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

        const synthesisStart = performance.now();
        const synthesisResult = streamText({ model: getModel(model), prompt: synthesisPrompt });

        for await (const text of synthesisResult.textStream) {
          await writer.write("text-delta", { text });
        }

        const synthesisUsage = await synthesisResult.usage;
        const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
        const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
        const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
        const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthUsageInfo);
        totalUsage.durationMs = Math.round(performance.now() - overallStart);

        await writer.write("agent:end", { agent: "supervisor" });
        await writer.write("done", {
          toolsUsed: [...new Set(allToolsUsed)],
          conversationId: convId,
          tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })),
          usage: totalUsage,
        });
        unsub();
        return;
      }

      // ── Direct mode ─────────────────────────────────────────
      // routeToAgent calls already executed inline by the SDK.
      // Bus events (delegate:start/end, tool:call/result) already forwarded.

      // Collect sub-agent responses from routeToAgent results
      const routeResults = planResult.steps
        .flatMap((step) => step.toolResults)
        .filter((tr) => tr.toolName === "routeToAgent");

      if (routeResults.length > 0) {
        // Synthesis — stream the response (consistent with createTask path)
        await writer.write("agent:think", { text: "Synthesizing results..." });

        const agentResponses = routeResults.map((tr) => (tr as any).output?.response ?? "");
        const synthesisPrompt = `Here are the results from the specialist agent(s):\n\n${agentResponses.map((r, i) => `Result ${i + 1}:\n${r}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

        const synthesisStart = performance.now();
        const synthesisResult = streamText({ model: getModel(model), prompt: synthesisPrompt });

        for await (const text of synthesisResult.textStream) {
          await writer.write("text-delta", { text });
        }

        const synthesisUsage = await synthesisResult.usage;
        const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
        const routeToolsUsed = routeResults.flatMap((tr) => (tr as any).output?.toolsUsed ?? []);
        const subAgentUsages = routeResults
          .map((tr) => (tr as any).output?.usage)
          .filter((u): u is UsageInfo => !!u);
        const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthUsageInfo);
        totalUsage.durationMs = Math.round(performance.now() - overallStart);

        await writer.write("agent:end", { agent: "supervisor" });
        await writer.write("done", {
          toolsUsed: [...new Set(["routeToAgent", ...routeToolsUsed])],
          conversationId: convId,
          usage: totalUsage,
        });
      } else {
        // No routeToAgent results — emit whatever text the supervisor generated
        if (planResult.text) {
          await writer.write("text-delta", { text: planResult.text });
        }

        await writer.write("agent:end", { agent: "supervisor" });
        await writer.write("done", {
          toolsUsed: [...new Set(planResult.steps.flatMap((step) => step.toolCalls).map((tc) => tc.toolName))],
          conversationId: convId,
          usage: { ...planUsage, durationMs: Math.round(performance.now() - overallStart) },
        });
      }
      unsub();
    });
  };
}

function buildJsonHandler(allowedAgents?: string[], defaultAutonomous = true) {
  return async (c: Context, { systemPrompt, memoryContext }: { systemPrompt: string; memoryContext?: string }) => {
    const body = await c.req.json();
    const { message, conversationId: cid, model, approvedPlan, autonomous: reqAutonomous } = body;
    const autonomous = reqAutonomous ?? defaultAutonomous;

    if (approvedPlan && Array.isArray(approvedPlan) && approvedPlan.length > 0) {
      const overallStart = performance.now();
      const results = await Promise.all(
        approvedPlan.map((task: { agent: string; query: string; skills?: string[] }) => executeTask(task.agent, task.query, task.skills))
      );

      const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

      const synthesisStart = performance.now();
      const synthesisResult = await generateText({ model: getModel(model), prompt: synthesisPrompt });
      const synthUsage = extractUsage(synthesisResult, synthesisStart);

      const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
      const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
      const totalUsage = mergeUsage(...subAgentUsages, synthUsage);
      totalUsage.durationMs = Math.round(performance.now() - overallStart);

      return c.json({
        response: synthesisResult.text,
        toolsUsed: [...new Set(allToolsUsed)],
        tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })),
        conversationId: generateConversationId(cid),
        usage: totalUsage,
      }, 200);
    }

    let system = await buildSystemPrompt(systemPrompt, allowedAgents);
    if (memoryContext) system += `\n\n## Memory Context\n${memoryContext}`;

    const result = await runSupervisorAgent(message, model, allowedAgents, autonomous);
    return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
  };
}

export function createSupervisorAgent(config: SupervisorAgentConfig) {
  const {
    name,
    description = "Unified supervisor agent that routes queries directly or creates parallel task plans",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    agents,
    autonomous = true,
  } = config;

  agentRegistry.register({
    name,
    description,
    toolNames: ["routeToAgent", "createTask"],
    defaultFormat: "sse",
    defaultSystem: systemPrompt,
    isOrchestrator: true,
    agents,
    sseHandler: buildSseHandler(agents, autonomous),
    jsonHandler: buildJsonHandler(agents, autonomous),
  });
}

// Default self-registration
createSupervisorAgent({ name: "supervisor" });
