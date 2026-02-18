import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { generateText, streamText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { streamAgentResponse } from "../../lib/stream-helpers.js";
import { getModel, extractUsage, mergeUsage, type UsageInfo } from "../../lib/ai-provider.js";
import { WEATHER_AGENT_CONFIG } from "../../agents/weather-agent.js";
import { HACKERNEWS_AGENT_CONFIG } from "../../agents/hackernews-agent.js";
import { KNOWLEDGE_AGENT_CONFIG } from "../../agents/knowledge-agent.js";
import { SUPERVISOR_AGENT_CONFIG } from "../../agents/supervisor-agent.js";
import { MEMORY_AGENT_CONFIG } from "../../agents/memory-agent.js";
import { CODING_AGENT_CONFIG } from "../../agents/coding-agent.js";
import {
  runHumanInLoopAgent,
  approveAction,
} from "../../agents/human-in-loop-agent.js";
import { runWeatherAgent } from "../../agents/weather-agent.js";
import { runHackernewsAgent } from "../../agents/hackernews-agent.js";
import { runKnowledgeAgent } from "../../agents/knowledge-agent.js";
import { runRecipeAgent } from "../../agents/recipe-agent.js";
import { runGuardrailsAgent } from "../../agents/guardrails-agent.js";

function conversationId(existing?: string) {
  return existing ?? `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Simple streaming agents ---

export async function handleWeatherAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  return streamAgentResponse(c, {
    ...WEATHER_AGENT_CONFIG,
    prompt: message,
    model,
    conversationId: conversationId(cid),
  });
}

export async function handleHackernewsAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  return streamAgentResponse(c, {
    ...HACKERNEWS_AGENT_CONFIG,
    prompt: message,
    model,
    conversationId: conversationId(cid),
  });
}

export async function handleKnowledgeAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  return streamAgentResponse(c, {
    ...KNOWLEDGE_AGENT_CONFIG,
    prompt: message,
    model,
    conversationId: conversationId(cid),
  });
}

export async function handleSupervisorAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  return streamAgentResponse(c, {
    ...SUPERVISOR_AGENT_CONFIG,
    prompt: message,
    model,
    conversationId: conversationId(cid),
  });
}

export async function handleMemoryAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  return streamAgentResponse(c, {
    ...MEMORY_AGENT_CONFIG,
    prompt: message,
    model,
    conversationId: conversationId(cid),
  });
}

export async function handleCodingAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  return streamAgentResponse(c, {
    ...CODING_AGENT_CONFIG,
    prompt: message,
    model,
    conversationId: conversationId(cid),
  });
}

// --- Human-in-loop (stays JSON) ---

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

// --- Structured output agent (JSON, not SSE) ---

export async function handleRecipeAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runRecipeAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) }, 200);
}

// --- Guardrails agent (JSON, not SSE) ---

export async function handleGuardrailsAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const result = await runGuardrailsAgent(message, model);
  return c.json({ ...result, conversationId: conversationId(cid) }, 200);
}

// --- Task agent (custom hybrid streaming) ---

async function executeTask(
  agent: string,
  query: string
): Promise<{ agent: string; query: string; result: { response: string; toolsUsed: string[]; usage?: UsageInfo } }> {
  let result: { response: string; toolsUsed: string[]; usage?: UsageInfo };

  switch (agent) {
    case "weather":
      result = await runWeatherAgent(query);
      break;
    case "hackernews":
      result = await runHackernewsAgent(query);
      break;
    case "knowledge":
      result = await runKnowledgeAgent(query);
      break;
    default:
      result = { response: `Unknown agent: ${agent}`, toolsUsed: [] };
  }

  return { agent, query, result };
}

export async function handleTaskAgent(c: Context) {
  const { message, conversationId: cid, model } = await c.req.json();
  const convId = conversationId(cid);
  const overallStart = performance.now();

  return streamSSE(c, async (stream) => {
    let id = 0;

    // Phase 1: Planning (non-streaming)
    await stream.writeSSE({
      id: String(id++),
      event: "status",
      data: JSON.stringify({ phase: "planning" }),
    });

    const createTaskTool = tool({
      description: "Create a sub-task to be delegated to a specialist agent. Tasks run in parallel.",
      inputSchema: z.object({
        agent: z.enum(["weather", "hackernews", "knowledge"]).describe("The specialist agent to handle this task"),
        query: z.string().describe("The specific query for this task"),
      }),
      execute: async ({ agent, query }) => ({ agent, query, status: "queued" }),
    });

    const planStart = performance.now();
    const planResult = await generateText({
      model: getModel(model),
      system: `You are a task delegation agent that breaks complex queries into parallel sub-tasks.

When you receive a complex query that spans multiple domains:
1. Analyze what information is needed
2. Create individual tasks using the createTask tool for each distinct sub-query
3. Tasks will be executed in parallel for efficiency

Available agents for tasks:
- weather: Weather information
- hackernews: Hacker News stories and tech news
- knowledge: Movie information and recommendations

Create one task per distinct information need. Be specific in your task queries.`,
      prompt: message,
      tools: { createTask: createTaskTool },
      stopWhen: stepCountIs(5),
    });
    const planUsage = extractUsage(planResult, planStart);

    // Collect task proposals
    const tasks: { agent: string; query: string }[] = [];
    for (const step of planResult.steps) {
      for (const tc of step.toolCalls) {
        if (tc.toolName === "createTask" && (tc as any).input) {
          const input = (tc as any).input as { agent?: string; query?: string };
          if (input.agent && input.query) {
            tasks.push({ agent: input.agent, query: input.query });
          }
        }
      }
    }

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

    // Emit tool-result events for each completed sub-task
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
    const synthDurationMs = Math.round(performance.now() - synthesisStart);

    // Aggregate usage
    const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
    const subAgentUsages = results
      .map((r) => r.result.usage)
      .filter((u): u is UsageInfo => !!u);

    const synthUsageInfo: UsageInfo = {
      inputTokens: synthesisUsage?.inputTokens ?? 0,
      outputTokens: synthesisUsage?.outputTokens ?? 0,
      totalTokens: synthesisUsage?.totalTokens ?? ((synthesisUsage?.inputTokens ?? 0) + (synthesisUsage?.outputTokens ?? 0)),
      cost: typeof synthesisUsage?.raw?.cost === "number" ? synthesisUsage.raw.cost : null,
      durationMs: synthDurationMs,
    };

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
