import { generateText, streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { extractUsage, extractStreamUsage, mergeUsage, type UsageInfo } from "../lib/ai-provider.js";
import { executeTask, type TaskResult } from "./execute-task.js";
import { generateConversationId } from "../registry/handler-factories.js";
import { getOrchestratorAgents, getEventBus, getAbortSignal, delegationStore } from "../lib/delegation-context.js";
import { registerRequest, cancelRequest, unregisterRequest } from "../lib/request-registry.js";
import { SSE_EVENTS, BUS_EVENTS, BUS_TO_SSE_MAP, FORWARDED_BUS_EVENTS } from "../lib/events.js";
import { TOOL_NAMES, DEFAULTS } from "../lib/constants.js";
import type { CardData } from "../lib/card-registry.js";
import type { CardRegistry } from "../lib/card-registry.js";
import type { AgentEventBus } from "../lib/agent-events.js";
import type { PluginContext } from "../context.js";
import type { AgentRegistration } from "../registry/agent-registry.js";

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
- Don't attach skills when they would not meaningfully change the response
- You may attach multiple skills if they complement each other
- Each skill has a phase (query/response/both) — this is handled automatically, just select the right skills

Always use the routing tools - never answer domain questions directly.`;

export interface SupervisorAgentConfig {
  name: string;
  description?: string;
  systemPrompt?: string;
  agents?: string[];
  autonomous?: boolean;
}

// ── Serialized stream writer
interface StreamWriter {
  write(event: string, data: Record<string, unknown>): Promise<void>;
  flush(): Promise<void>;
}

function createStreamWriter(stream: { writeSSE: (msg: any) => Promise<void> }): StreamWriter {
  let id = 0;
  let chain = Promise.resolve();
  return {
    write(event: string, data: Record<string, unknown>) {
      const p = chain.then(() => stream.writeSSE({ id: String(id++), event, data: JSON.stringify(data) }));
      chain = p.catch(() => {});
      return p;
    },
    flush() { return chain; },
  };
}

function bridgeBusToStream(bus: AgentEventBus | undefined, writer: StreamWriter, cardRegistry: CardRegistry): { unsub: () => void; cards: CardData[] } {
  const cards: CardData[] = [];
  if (!bus) return { unsub: () => {}, cards };

  const unsub = bus.subscribe((event) => {
    if (!FORWARDED_BUS_EVENTS.has(event.type)) return;
    const sseEvent = BUS_TO_SSE_MAP[event.type] ?? event.type;
    let data = event.data;
    if (event.type === BUS_EVENTS.TOOL_CALL && data.tool && !data.toolName) data = { ...data, toolName: data.tool };
    if (event.type === BUS_EVENTS.TOOL_RESULT && data.tool && !data.toolName) data = { ...data, toolName: data.tool };
    if (event.type === BUS_EVENTS.TOOL_RESULT) {
      const toolName = (data as any).toolName ?? (data as any).tool;
      const result = (data as any).result;
      const extracted = cardRegistry.extract(toolName, result);
      cards.push(...extracted);
    }
    writer.write(sseEvent, data);
  });

  return { unsub, cards };
}

// ── Agent helpers
function getRoutableAgents(ctx: PluginContext, allowedAgents?: string[]) {
  const orchestrators = getOrchestratorAgents(ctx.agents);
  return ctx.agents.list().filter((a) => {
    if (orchestrators.has(a.name)) return false;
    if (!a.tools || Object.keys(a.tools).length === 0) return false;
    if (allowedAgents) return allowedAgents.includes(a.name);
    return true;
  });
}

function buildRoutingTool(ctx: PluginContext, allowedAgents?: string[]) {
  const agents = getRoutableAgents(ctx, allowedAgents);
  if (agents.length === 0) throw new Error("No routable agents available");
  const agentNames = agents.map((a) => a.name) as [string, ...string[]];

  return tool({
    description: "Route a query to a specialist agent for immediate execution.",
    inputSchema: z.object({
      agent: z.enum(agentNames).describe("The specialist agent to route to"),
      query: z.string().describe("The query to send to the agent"),
      skills: z.array(z.string()).optional().describe("Skill names to activate"),
    }),
    execute: async ({ agent, query, skills }) => {
      const taskResult = await executeTask(ctx, agent, query, skills);
      return { ...taskResult.result, [DEFAULTS.RESPONSE_SKILLS_KEY]: taskResult.responseSkills ?? [] };
    },
  });
}

function buildCreateTaskTool(ctx: PluginContext, allowedAgents?: string[]) {
  const agents = getRoutableAgents(ctx, allowedAgents);
  if (agents.length === 0) throw new Error("No routable agents available");
  const agentNames = agents.map((a) => a.name) as [string, ...string[]];

  return tool({
    description: "Create a sub-task to be delegated to a specialist agent. Tasks run in parallel.",
    inputSchema: z.object({
      agent: z.enum(agentNames).describe("The specialist agent"),
      query: z.string().describe("The specific query"),
      skills: z.array(z.string()).optional().describe("Skill names to activate"),
    }),
  });
}

async function buildSystemPrompt(ctx: PluginContext, basePrompt: string, allowedAgents?: string[]) {
  const agents = getRoutableAgents(ctx, allowedAgents);
  const agentList = agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");
  let prompt = `${basePrompt}\n\nAvailable agents:\n${agentList}`;
  const skillSummaries = await ctx.storage.skills.getSkillSummaries();
  prompt += `\n\nAvailable skills (pass skill names in the "skills" parameter when routing):\n${skillSummaries}`;
  return prompt;
}

function collectTasksFromSteps(steps: any[]): { agent: string; query: string; skills?: string[] }[] {
  const tasks: { agent: string; query: string; skills?: string[] }[] = [];
  for (const step of steps) {
    for (const tc of step.toolCalls) {
      if (tc.toolName === TOOL_NAMES.CREATE_TASK && (tc as any).input) {
        const input = (tc as any).input as { agent?: string; query?: string; skills?: string[] };
        if (input.agent && input.query) tasks.push({ agent: input.agent, query: input.query, skills: input.skills });
      }
    }
  }
  return tasks;
}

function collectResponseSkills(results: TaskResult[]): string[] {
  const all = results.flatMap((r) => r.responseSkills ?? []);
  return [...new Set(all)];
}

async function buildSynthesisContext(ctx: PluginContext, skillNames: string[]): Promise<string | undefined> {
  if (skillNames.length === 0) return undefined;
  const sections: string[] = [];
  for (const name of [...new Set(skillNames)]) {
    const skill = await ctx.storage.skills.getSkill(name);
    if (skill) sections.push(`### ${skill.name}\n${skill.content}`);
  }
  if (sections.length === 0) return undefined;
  return `# Active Skills\nApply the following behavioral instructions to your response:\n\n${sections.join("\n\n")}`;
}

// ── SSE handler
function buildSseHandler(ctx: PluginContext, agentName: string, allowedAgents?: string[], defaultAutonomous = true) {
  return async (c: Context, { systemPrompt, memoryContext }: { systemPrompt: string; memoryContext?: string }) => {
    const body = await c.req.json();
    const { message, conversationId: cid, model, planMode, approvedPlan, autonomous: reqAutonomous } = body;
    const convId = generateConversationId(cid);
    const autonomous = reqAutonomous ?? defaultAutonomous;
    const overallStart = performance.now();

    const controller = registerRequest(convId);
    const abortSignal = controller.signal;
    c.req.raw.signal.addEventListener("abort", () => cancelRequest(convId));
    const parentCtx = delegationStore.getStore();
    const delCtx = { ...parentCtx!, abortSignal };

    let system = await buildSystemPrompt(ctx, systemPrompt, allowedAgents);
    if (memoryContext) system += `\n\n## Memory Context\n${memoryContext}`;

    let historyMessages: Array<{ role: "user" | "assistant"; content: string }> | undefined;
    if (cid) {
      const conv = await ctx.storage.conversations.get(cid);
      if (conv) {
        historyMessages = [...conv.messages.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: message }];
      }
      await ctx.storage.conversations.append(cid, { role: "user", content: message, timestamp: new Date().toISOString() });
    }

    async function saveAssistantResponse(text: string, cards?: CardData[]) {
      if (cid && text) {
        await ctx.storage.conversations.append(cid, { role: "assistant", content: text, timestamp: new Date().toISOString(), ...(cards?.length ? { metadata: { cards } } : {}) });
      }
    }

    // approvedPlan shortcut
    if (approvedPlan && Array.isArray(approvedPlan) && approvedPlan.length > 0) {
      return delegationStore.run(delCtx, () => streamSSE(c, async (stream) => {
        const writer = createStreamWriter(stream);
        const bus = getEventBus();
        const { unsub, cards: collectedCards } = bridgeBusToStream(bus, writer, ctx.cards);
        await writer.write(SSE_EVENTS.SESSION_START, { conversationId: convId });
        try {
          await writer.write(SSE_EVENTS.AGENT_START, { agent: agentName });
          const results = await Promise.all(approvedPlan.map((task: any) => executeTask(ctx, task.agent, task.query, task.skills)));
          await writer.flush();
          const responseSkills = collectResponseSkills(results);
          const synthesisSystem = await buildSynthesisContext(ctx, responseSkills);
          if (responseSkills.length > 0) await writer.write(SSE_EVENTS.SKILL_INJECT, { agent: agentName, skills: responseSkills, phase: "response" });
          await writer.write(SSE_EVENTS.AGENT_THINK, { text: DEFAULTS.SYNTHESIS_MESSAGE });
          const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;
          const synthesisStart = performance.now();
          const synthesisResult = streamText({ model: ctx.getModel(model), ...(synthesisSystem && { system: synthesisSystem }), prompt: synthesisPrompt, abortSignal });
          let fullText = "";
          for await (const text of synthesisResult.textStream) { fullText += text; await writer.write(SSE_EVENTS.TEXT_DELTA, { text }); }
          await saveAssistantResponse(fullText, collectedCards);
          const synthesisUsage = await synthesisResult.usage;
          const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
          const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
          const totalUsage = mergeUsage(...subAgentUsages, synthUsageInfo);
          totalUsage.durationMs = Math.round(performance.now() - overallStart);
          await writer.write(SSE_EVENTS.AGENT_END, { agent: agentName });
          await writer.write(SSE_EVENTS.DONE, { toolsUsed: [...new Set(results.flatMap((r) => r.result.toolsUsed))], conversationId: convId, tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })), usage: totalUsage });
        } catch (err: any) {
          if (err.name === "AbortError" || abortSignal?.aborted) await writer.write(SSE_EVENTS.CANCELLED, { conversationId: convId });
          else throw err;
        } finally { unregisterRequest(convId); unsub(); }
      }));
    }

    const tools: Record<string, any> = {};
    if (planMode) {
      tools[TOOL_NAMES.CREATE_TASK] = buildCreateTaskTool(ctx, allowedAgents);
    } else {
      tools[TOOL_NAMES.ROUTE_TO_AGENT] = buildRoutingTool(ctx, allowedAgents);
      tools[TOOL_NAMES.CREATE_TASK] = buildCreateTaskTool(ctx, allowedAgents);
    }

    return delegationStore.run(delCtx, () => streamSSE(c, async (stream) => {
      const writer = createStreamWriter(stream);
      const bus = getEventBus();
      const { unsub, cards: collectedCards } = bridgeBusToStream(bus, writer, ctx.cards);
      await writer.write(SSE_EVENTS.SESSION_START, { conversationId: convId });
      try {
        await writer.write(SSE_EVENTS.AGENT_START, { agent: agentName });
        const planStart = performance.now();
        const planResult = await generateText({
          model: ctx.getModel(model), system,
          ...(historyMessages ? { messages: historyMessages.map(m => ({ role: m.role, content: m.content })) } : { prompt: message }),
          tools, stopWhen: stepCountIs(ctx.defaultMaxSteps), abortSignal,
        });
        const planUsage = extractUsage(planResult, planStart);
        await writer.flush();

        // Reactive clarification check
        if (!autonomous) {
          for (const step of planResult.steps) {
            for (const tr of step.toolResults) {
              if (tr.toolName === TOOL_NAMES.ROUTE_TO_AGENT) {
                const output = (tr as any).output;
                if (output?.items?.length) {
                  const agent = (planResult.steps.flatMap((s) => s.toolCalls).find((tc) => tc.toolName === TOOL_NAMES.ROUTE_TO_AGENT)?.input as any)?.agent;
                  const taggedItems = output.items.map((item: any) => ({ ...item, agent }));
                  await writer.write(SSE_EVENTS.ASK_USER, { items: taggedItems });
                  await writer.write(SSE_EVENTS.AGENT_END, { agent: agentName });
                  const subAgentUsage = output?.usage as UsageInfo | undefined;
                  const totalUsage = subAgentUsage ? mergeUsage(planUsage, subAgentUsage) : { ...planUsage };
                  totalUsage.durationMs = Math.round(performance.now() - overallStart);
                  await writer.write(SSE_EVENTS.DONE, { toolsUsed: [TOOL_NAMES.ROUTE_TO_AGENT], conversationId: convId, awaitingResponse: true, items: taggedItems, usage: totalUsage });
                  return;
                }
              }
            }
          }
        }

        const tasks = collectTasksFromSteps(planResult.steps);

        if (tasks.length > 0) {
          await writer.write(SSE_EVENTS.AGENT_PLAN, { tasks });
          if (!autonomous) {
            await writer.write(SSE_EVENTS.AGENT_END, { agent: agentName });
            await writer.write(SSE_EVENTS.DONE, { toolsUsed: [TOOL_NAMES.CREATE_TASK], conversationId: convId, awaitingApproval: true, tasks, usage: { ...planUsage, durationMs: Math.round(performance.now() - overallStart) } });
            return;
          }
          const results = await Promise.all(tasks.map((task) => executeTask(ctx, task.agent, task.query, task.skills)));
          await writer.flush();
          const responseSkills = collectResponseSkills(results);
          const synthesisSystem = await buildSynthesisContext(ctx, responseSkills);
          if (responseSkills.length > 0) await writer.write(SSE_EVENTS.SKILL_INJECT, { agent: agentName, skills: responseSkills, phase: "response" });
          await writer.write(SSE_EVENTS.AGENT_THINK, { text: DEFAULTS.SYNTHESIS_MESSAGE });
          const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;
          const synthesisStart = performance.now();
          const synthesisResult = streamText({ model: ctx.getModel(model), ...(synthesisSystem && { system: synthesisSystem }), prompt: synthesisPrompt, abortSignal });
          let fullText = "";
          for await (const text of synthesisResult.textStream) { fullText += text; await writer.write(SSE_EVENTS.TEXT_DELTA, { text }); }
          await saveAssistantResponse(fullText, collectedCards);
          const synthesisUsage = await synthesisResult.usage;
          const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
          const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
          const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthUsageInfo);
          totalUsage.durationMs = Math.round(performance.now() - overallStart);
          await writer.write(SSE_EVENTS.AGENT_END, { agent: agentName });
          await writer.write(SSE_EVENTS.DONE, { toolsUsed: [...new Set(results.flatMap((r) => r.result.toolsUsed))], conversationId: convId, tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })), usage: totalUsage });
          return;
        }

        // Direct mode
        const routeResults = planResult.steps.flatMap((step) => step.toolResults).filter((tr) => tr.toolName === TOOL_NAMES.ROUTE_TO_AGENT);
        if (routeResults.length > 0) {
          const responseSkills = [...new Set(routeResults.flatMap((tr) => (tr as any).output?.[DEFAULTS.RESPONSE_SKILLS_KEY] ?? []))];
          const synthesisSystem = await buildSynthesisContext(ctx, responseSkills);
          if (responseSkills.length > 0) await writer.write(SSE_EVENTS.SKILL_INJECT, { agent: agentName, skills: responseSkills, phase: "response" });
          await writer.write(SSE_EVENTS.AGENT_THINK, { text: DEFAULTS.SYNTHESIS_MESSAGE });
          const agentResponses = routeResults.map((tr) => (tr as any).output?.response ?? "");
          const synthesisPrompt = `Here are the results from the specialist agent(s):\n\n${agentResponses.map((r, i) => `Result ${i + 1}:\n${r}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;
          const synthesisStart = performance.now();
          const synthesisResult = streamText({ model: ctx.getModel(model), ...(synthesisSystem && { system: synthesisSystem }), prompt: synthesisPrompt, abortSignal });
          let fullText = "";
          for await (const text of synthesisResult.textStream) { fullText += text; await writer.write(SSE_EVENTS.TEXT_DELTA, { text }); }
          await saveAssistantResponse(fullText, collectedCards);
          const synthesisUsage = await synthesisResult.usage;
          const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
          const routeToolsUsed = routeResults.flatMap((tr) => (tr as any).output?.toolsUsed ?? []);
          const subAgentUsages = routeResults.map((tr) => (tr as any).output?.usage).filter((u): u is UsageInfo => !!u);
          const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthUsageInfo);
          totalUsage.durationMs = Math.round(performance.now() - overallStart);
          await writer.write(SSE_EVENTS.AGENT_END, { agent: agentName });
          await writer.write(SSE_EVENTS.DONE, { toolsUsed: [...new Set([TOOL_NAMES.ROUTE_TO_AGENT, ...routeToolsUsed])], conversationId: convId, usage: totalUsage });
        } else {
          if (planResult.text) { await writer.write(SSE_EVENTS.TEXT_DELTA, { text: planResult.text }); await saveAssistantResponse(planResult.text, collectedCards); }
          await writer.write(SSE_EVENTS.AGENT_END, { agent: agentName });
          await writer.write(SSE_EVENTS.DONE, { toolsUsed: [...new Set(planResult.steps.flatMap((step) => step.toolCalls).map((tc) => tc.toolName))], conversationId: convId, usage: { ...planUsage, durationMs: Math.round(performance.now() - overallStart) } });
        }
      } catch (err: any) {
        if (err.name === "AbortError" || abortSignal.aborted) await writer.write(SSE_EVENTS.CANCELLED, { conversationId: convId });
        else throw err;
      } finally { unregisterRequest(convId); unsub(); }
    }));
  };
}

// ── JSON handler
function buildJsonHandler(ctx: PluginContext, agentName: string, allowedAgents?: string[], defaultAutonomous = true) {
  return async (c: Context, { systemPrompt, memoryContext }: { systemPrompt: string; memoryContext?: string }) => {
    const body = await c.req.json();
    const { message, conversationId: cid, model, approvedPlan, autonomous: reqAutonomous } = body;
    const autonomous = reqAutonomous ?? defaultAutonomous;

    if (approvedPlan && Array.isArray(approvedPlan) && approvedPlan.length > 0) {
      const overallStart = performance.now();
      const results = await Promise.all(approvedPlan.map((task: any) => executeTask(ctx, task.agent, task.query, task.skills)));
      const responseSkills = collectResponseSkills(results);
      const synthesisSystem = await buildSynthesisContext(ctx, responseSkills);
      const bus = getEventBus();
      if (responseSkills.length > 0) bus?.emit(BUS_EVENTS.SKILL_INJECT, { agent: agentName, skills: responseSkills, phase: "response" });
      const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;
      const synthesisStart = performance.now();
      const synthesisResult = await generateText({ model: ctx.getModel(model), ...(synthesisSystem && { system: synthesisSystem }), prompt: synthesisPrompt });
      const synthUsage = extractUsage(synthesisResult, synthesisStart);
      const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
      const totalUsage = mergeUsage(...subAgentUsages, synthUsage);
      totalUsage.durationMs = Math.round(performance.now() - overallStart);
      return c.json({ response: synthesisResult.text, toolsUsed: [...new Set(results.flatMap((r) => r.result.toolsUsed))], tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })), conversationId: generateConversationId(cid), usage: totalUsage }, 200);
    }

    // Build system prompt including agent+skill summaries
    let system = await buildSystemPrompt(ctx, systemPrompt, allowedAgents);
    if (memoryContext) system += `\n\n## Memory Context\n${memoryContext}`;

    const startTime = performance.now();
    const routeToAgentTool = buildRoutingTool(ctx, allowedAgents);
    const createTaskTool = buildCreateTaskTool(ctx, allowedAgents);

    const result = await generateText({
      model: ctx.getModel(model), system, prompt: message,
      tools: { [TOOL_NAMES.ROUTE_TO_AGENT]: routeToAgentTool, [TOOL_NAMES.CREATE_TASK]: createTaskTool },
      stopWhen: stepCountIs(ctx.defaultMaxSteps), abortSignal: getAbortSignal(),
    });

    // Handle deferred createTask calls
    const tasks = collectTasksFromSteps(result.steps);
    if (tasks.length > 0) {
      const results = await Promise.all(tasks.map((task) => executeTask(ctx, task.agent, task.query, task.skills)));
      const responseSkills = collectResponseSkills(results);
      const synthesisSystem = await buildSynthesisContext(ctx, responseSkills);
      const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;
      const synthesisStart = performance.now();
      const synthesisResult = await generateText({ model: ctx.getModel(model), ...(synthesisSystem && { system: synthesisSystem }), prompt: synthesisPrompt, abortSignal: getAbortSignal() });
      const synthUsage = extractUsage(synthesisResult, synthesisStart);
      const supervisorUsage = extractUsage(result, startTime);
      const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
      const totalUsage = mergeUsage(supervisorUsage, ...subAgentUsages, synthUsage);
      totalUsage.durationMs = Math.round(performance.now() - startTime);
      return c.json({ response: synthesisResult.text, toolsUsed: [...new Set(results.flatMap((r) => r.result.toolsUsed))], agentsUsed: [...new Set(results.map((r) => r.agent))], tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })), conversationId: generateConversationId(cid), usage: totalUsage }, 200);
    }

    // Direct routeToAgent path
    const supervisorUsage = extractUsage(result, startTime);
    const routeResultUsages = result.steps.flatMap((step) => step.toolResults).filter((tr) => tr.toolName === TOOL_NAMES.ROUTE_TO_AGENT).map((tr) => (tr as any).output?.usage).filter((u): u is UsageInfo => !!u);
    const toolsUsed = result.steps.flatMap((step) => step.toolCalls).map((tc) => tc.toolName);
    const agentsUsed = result.steps.flatMap((step) => step.toolCalls).map((tc) => (tc as any).input).filter((input): input is { agent: string } => !!input?.agent).map((args) => args.agent);

    return c.json({
      response: result.text,
      toolsUsed: [...new Set(toolsUsed)],
      agentsUsed: [...new Set(agentsUsed)],
      conversationId: generateConversationId(cid),
      usage: routeResultUsages.length > 0 ? mergeUsage(supervisorUsage, ...routeResultUsages) : supervisorUsage,
    }, 200);
  };
}

/**
 * Factory: creates and registers a supervisor agent on the given plugin context.
 * Returns the AgentRegistration for further customization.
 */
export function createSupervisorAgent(ctx: PluginContext, config: SupervisorAgentConfig): AgentRegistration {
  const {
    name,
    description = "Unified supervisor agent that routes queries directly or creates parallel task plans",
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    agents,
    autonomous = true,
  } = config;

  const registration: AgentRegistration = {
    name,
    description,
    toolNames: [TOOL_NAMES.ROUTE_TO_AGENT, TOOL_NAMES.CREATE_TASK],
    defaultFormat: "sse",
    defaultSystem: systemPrompt,
    isOrchestrator: true,
    agents,
    sseHandler: buildSseHandler(ctx, name, agents, autonomous),
    jsonHandler: buildJsonHandler(ctx, name, agents, autonomous),
  };

  ctx.agents.register(registration);
  return registration;
}
