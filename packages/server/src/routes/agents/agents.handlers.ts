import type { Context } from "hono";
import { generateObject, streamText, stepCountIs } from "ai";
import { streamSSE } from "hono/streaming";
import { streamAgentResponse } from "../../lib/stream-helpers.js";
import { getModel, extractUsage, extractStreamUsage, mergeUsage, type UsageInfo } from "../../lib/ai-provider.js";
import { WEATHER_AGENT_CONFIG } from "../../agents/weather-agent.js";
import { HACKERNEWS_AGENT_CONFIG } from "../../agents/hackernews-agent.js";
import { KNOWLEDGE_AGENT_CONFIG } from "../../agents/knowledge-agent.js";
import { SUPERVISOR_AGENT_CONFIG } from "../../agents/supervisor-agent.js";
import { MEMORY_AGENT_CONFIG } from "../../agents/memory-agent.js";
import { CODING_AGENT_CONFIG } from "../../agents/coding-agent.js";
import { COMPACT_AGENT_CONFIG } from "../../agents/compact-agent.js";
import {
  runHumanInLoopAgent,
  approveAction,
} from "../../agents/human-in-loop-agent.js";
import { runRecipeAgent } from "../../agents/recipe-agent.js";
import { GUARDRAILS_CONFIG } from "../../agents/guardrails-agent.js";
import {
  TASK_AGENT_SYSTEM_PROMPT,
  createTaskTool,
  collectTasksFromSteps,
} from "../../agents/task-agent.js";
import { executeTask } from "../../agents/execute-task.js";

function generateConversationId(existing?: string) {
  return existing ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Stream handler factory for simple agents ---

interface AgentConfig {
  system: string;
  tools: Record<string, any>;
}

function makeStreamHandler(config: AgentConfig) {
  return async (c: Context) => {
    const { message, conversationId: cid, model } = await c.req.json();
    return streamAgentResponse(c, {
      ...config,
      prompt: message,
      model,
      conversationId: generateConversationId(cid),
    });
  };
}

export const handleWeatherAgent = makeStreamHandler(WEATHER_AGENT_CONFIG);
export const handleHackernewsAgent = makeStreamHandler(HACKERNEWS_AGENT_CONFIG);
export const handleKnowledgeAgent = makeStreamHandler(KNOWLEDGE_AGENT_CONFIG);
export const handleSupervisorAgent = makeStreamHandler(SUPERVISOR_AGENT_CONFIG);
export const handleMemoryAgent = makeStreamHandler(MEMORY_AGENT_CONFIG);
export const handleCodingAgent = makeStreamHandler(CODING_AGENT_CONFIG);
export const handleCompactAgent = makeStreamHandler(COMPACT_AGENT_CONFIG);

// --- Human-in-loop (JSON) ---

export async function handleHumanInLoopAgent(c: Context) {
  const { message, model } = await c.req.json();
  const result = await runHumanInLoopAgent(message, model);
  return c.json(result, 200);
}

export async function handleHumanInLoopApprove(c: Context) {
  const { id, approved } = await c.req.json();
  const result = await approveAction(id, approved);
  return c.json(result, 200);
}

// --- Human-in-loop (SSE stream) ---

export async function handleHumanInLoopAgentStream(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const convId = generateConversationId(cid);

  return streamSSE(c, async (stream) => {
    let id = 0;

    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({ phase: "proposing action" }),
    });

    const result = await runHumanInLoopAgent(message, model);

    for (const action of result.pendingActions) {
      await stream.writeSSE({
        id: String(id++),
        event: "tool-call",
        data: JSON.stringify({ toolName: action.action, args: action.parameters }),
      });
    }

    await stream.writeSSE({
      id: String(id++),
      event: "proposal",
      data: JSON.stringify({
        actions: result.pendingActions.map((a: any) => ({
          id: a.id,
          action: a.action,
          parameters: a.parameters,
        })),
      }),
    });

    await stream.writeSSE({
      id: String(id++),
      event: "done",
      data: JSON.stringify({ conversationId: convId, usage: result.usage }),
    });
  });
}

// --- Structured output agent (JSON) ---

export async function handleRecipeAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runRecipeAgent(message, model);
  return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
}

// --- Guardrails agent (JSON) ---

export async function handleGuardrailsAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const { runGuardrailsAgent } = await import("../../agents/guardrails-agent.js");
  const result = await runGuardrailsAgent(message, model);
  return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
}

// --- Guardrails agent (SSE stream) ---

export async function handleGuardrailsAgentStream(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const convId = generateConversationId(cid);
  const overallStart = performance.now();
  const aiModel = getModel(model);
  const { classificationSchema, classificationPrompt, advicePrompt } = GUARDRAILS_CONFIG;

  return streamSSE(c, async (stream) => {
    let id = 0;

    // Phase 1: Classification
    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({ phase: "classifying" }),
    });

    const classifyStart = performance.now();
    const classification = await generateObject({
      model: aiModel,
      system: classificationPrompt,
      prompt: message,
      schema: classificationSchema,
    });
    const classifyUsage = extractUsage(classification, classifyStart);
    const { allowed, category, reason } = classification.object;

    await stream.writeSSE({
      id: String(id++),
      event: "classification",
      data: JSON.stringify({ allowed, category, reason }),
    });

    if (!allowed) {
      await stream.writeSSE({
        id: String(id++),
        event: "done",
        data: JSON.stringify({
          conversationId: convId,
          usage: { ...classifyUsage, durationMs: Math.round(performance.now() - overallStart) },
        }),
      });
      return;
    }

    // Phase 2: Stream advice
    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({ phase: "generating advice" }),
    });

    const adviceStart = performance.now();
    const adviceResult = streamText({
      model: aiModel,
      system: advicePrompt,
      prompt: message,
    });

    for await (const text of adviceResult.textStream) {
      await stream.writeSSE({
        id: String(id++),
        event: "text-delta",
        data: JSON.stringify({ text }),
      });
    }

    const adviceUsage = await adviceResult.usage;
    const adviceUsageInfo = extractStreamUsage(adviceUsage, adviceStart);

    const totalUsage = mergeUsage(classifyUsage, adviceUsageInfo);
    totalUsage.durationMs = Math.round(performance.now() - overallStart);

    await stream.writeSSE({
      id: String(id++),
      event: "done",
      data: JSON.stringify({ conversationId: convId, usage: totalUsage }),
    });
  });
}

// --- Task agent (custom hybrid streaming) ---

export async function handleTaskAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const convId = generateConversationId(cid);
  const overallStart = performance.now();

  return streamSSE(c, async (stream) => {
    let id = 0;

    // Phase 1: Planning
    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({ phase: "planning" }),
    });

    const planStart = performance.now();
    const { generateText } = await import("ai");
    const planResult = await generateText({
      model: getModel(model),
      system: TASK_AGENT_SYSTEM_PROMPT,
      prompt: message,
      tools: { createTask: createTaskTool },
      stopWhen: stepCountIs(5),
    });
    const planUsage = extractUsage(planResult, planStart);

    const tasks = collectTasksFromSteps(planResult.steps);

    if (tasks.length === 0) {
      await stream.writeSSE({
        id: String(id++),
        event: "text-delta",
        data: JSON.stringify({ text: planResult.text || "I couldn't identify any sub-tasks to execute." }),
      });
      await stream.writeSSE({
        id: String(id++),
        event: "done",
        data: JSON.stringify({
          toolsUsed: [],
          conversationId: convId,
          tasks: [],
          usage: { ...planUsage, durationMs: Math.round(performance.now() - overallStart) },
        }),
      });
      return;
    }

    // Phase 2: Executing sub-tasks in parallel
    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({
        phase: "executing",
        tasks: tasks.map((t) => ({ agent: t.agent, query: t.query })),
      }),
    });

    const results = await Promise.all(
      tasks.map((task) => executeTask(task.agent, task.query))
    );

    for (const r of results) {
      await stream.writeSSE({
        id: String(id++),
        event: "tool-result",
        data: JSON.stringify({
          toolName: `task:${r.agent}`,
          result: { query: r.query, summary: r.result.response.slice(0, 200) },
        }),
      });
    }

    // Phase 3: Synthesis (streaming)
    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({ phase: "synthesizing" }),
    });

    const synthesisPrompt = `Here are the results from parallel task execution:

${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}

Please synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

    const synthesisStart = performance.now();
    const synthesisResult = streamText({
      model: getModel(model),
      prompt: synthesisPrompt,
    });

    for await (const text of synthesisResult.textStream) {
      await stream.writeSSE({
        id: String(id++),
        event: "text-delta",
        data: JSON.stringify({ text }),
      });
    }

    const synthesisUsage = await synthesisResult.usage;
    const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);

    // Aggregate usage
    const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
    const subAgentUsages = results
      .map((r) => r.result.usage)
      .filter((u): u is UsageInfo => !!u);

    const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthUsageInfo);
    totalUsage.durationMs = Math.round(performance.now() - overallStart);

    await stream.writeSSE({
      id: String(id++),
      event: "done",
      data: JSON.stringify({
        toolsUsed: [...new Set(allToolsUsed)],
        conversationId: convId,
        tasks: results.map((r) => ({
          agent: r.agent,
          query: r.query,
          summary: r.result.response.slice(0, 200),
        })),
        usage: totalUsage,
      }),
    });
  });
}
