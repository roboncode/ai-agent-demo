import { generateText, tool, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import { getModel, extractUsage, extractStreamUsage, mergeUsage, type UsageInfo } from "../lib/ai-provider.js";
import { executeTask } from "./execute-task.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { generateConversationId } from "../registry/handler-factories.js";

const BASE_SYSTEM_PROMPT = `You are a task delegation agent that breaks complex queries into parallel sub-tasks.

When you receive a complex query that spans multiple domains:
1. Analyze what information is needed
2. Create individual tasks using the createTask tool for each distinct sub-query
3. Tasks will be executed in parallel for efficiency

Create one task per distinct information need. Be specific in your task queries.`;

// Agents that should not be delegated to (would cause circular calls or don't support task execution)
const EXCLUDED_AGENTS = new Set(["supervisor", "task"]);

function getDelegatableAgents() {
  return agentRegistry.list().filter((a) => !EXCLUDED_AGENTS.has(a.name) && a.tools);
}

function buildCreateTaskTool() {
  const agents = getDelegatableAgents();
  const agentNames = agents.map((a) => a.name) as [string, ...string[]];

  return tool({
    description:
      "Create a sub-task to be delegated to a specialist agent. Tasks run in parallel.",
    inputSchema: z.object({
      agent: z.enum(agentNames).describe("The specialist agent to handle this task"),
      query: z.string().describe("The specific query for this task"),
    }),
    execute: async ({ agent, query }) => {
      return { agent, query, status: "queued" };
    },
  });
}

function buildSystemPrompt(basePrompt: string) {
  const agents = getDelegatableAgents();
  const agentList = agents.map((a) => `- ${a.name}: ${a.description}`).join("\n");
  return `${basePrompt}\n\nAvailable agents for tasks:\n${agentList}`;
}

export function collectTasksFromSteps(steps: any[]): { agent: string; query: string }[] {
  const tasks: { agent: string; query: string }[] = [];
  for (const step of steps) {
    for (const tc of step.toolCalls) {
      if (tc.toolName === "createTask" && (tc as any).input) {
        const input = (tc as any).input as { agent?: string; query?: string };
        if (input.agent && input.query) {
          tasks.push({ agent: input.agent, query: input.query });
        }
      }
    }
  }
  return tasks;
}

export async function runTaskAgent(message: string, model?: string) {
  const overallStart = performance.now();
  const createTaskTool = buildCreateTaskTool();
  const system = buildSystemPrompt(BASE_SYSTEM_PROMPT);

  // Phase 1: Let AI plan the tasks
  const planStart = performance.now();
  const planResult = await generateText({
    model: getModel(model),
    system,
    prompt: message,
    tools: { createTask: createTaskTool },
    stopWhen: stepCountIs(5),
  });
  const planUsage = extractUsage(planResult, planStart);

  const tasks = collectTasksFromSteps(planResult.steps);

  if (tasks.length === 0) {
    return {
      response: planResult.text || "I couldn't identify any sub-tasks to execute.",
      tasks: [],
      toolsUsed: [],
      usage: {
        ...planUsage,
        durationMs: Math.round(performance.now() - overallStart),
      },
    };
  }

  // Phase 2: Execute all tasks in parallel
  const results = await Promise.all(
    tasks.map((task) => executeTask(task.agent, task.query))
  );

  // Phase 3: Synthesize results
  const synthesisPrompt = `Here are the results from parallel task execution:

${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}

Please synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

  const synthesisStart = performance.now();
  const synthesisResult = await generateText({
    model: getModel(model),
    prompt: synthesisPrompt,
  });
  const synthesisUsage = extractUsage(synthesisResult, synthesisStart);

  const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);

  const subAgentUsages = results
    .map((r) => r.result.usage)
    .filter((u): u is UsageInfo => !!u);

  const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthesisUsage);
  totalUsage.durationMs = Math.round(performance.now() - overallStart);

  return {
    response: synthesisResult.text,
    tasks: results.map((r) => ({
      agent: r.agent,
      query: r.query,
      summary: r.result.response.slice(0, 200),
    })),
    toolsUsed: [...new Set(allToolsUsed)],
    usage: totalUsage,
  };
}

// Self-registration
agentRegistry.register({
  name: "task",
  description: "Parallel task delegation agent that breaks complex queries into sub-tasks",
  toolNames: ["createTask"],
  defaultFormat: "sse",
  defaultSystem: BASE_SYSTEM_PROMPT,
  jsonHandler: async (c: Context, { systemPrompt, memoryContext }) => {
    const { message, conversationId: cid, model } = await c.req.json();
    const result = await runTaskAgent(message, model);
    return c.json({ ...result, conversationId: generateConversationId(cid) }, 200);
  },
  sseHandler: async (c: Context, { systemPrompt, memoryContext }) => {
    const { message, conversationId: cid, model } = await c.req.json();
    const convId = generateConversationId(cid);
    const overallStart = performance.now();

    const createTaskTool = buildCreateTaskTool();
    let system = buildSystemPrompt(systemPrompt);
    if (memoryContext) {
      system += `\n\n## Memory Context\n${memoryContext}`;
    }

    return streamSSE(c, async (stream) => {
      let id = 0;

      // Phase 1: Planning
      await stream.writeSSE({ id: String(id++), event: "status", data: JSON.stringify({ phase: "planning" }) });

      const planStart = performance.now();
      const planResult = await generateText({
        model: getModel(model),
        system,
        prompt: message,
        tools: { createTask: createTaskTool },
        stopWhen: stepCountIs(5),
      });
      const planUsage = extractUsage(planResult, planStart);
      const tasks = collectTasksFromSteps(planResult.steps);

      if (tasks.length === 0) {
        await stream.writeSSE({ id: String(id++), event: "text-delta", data: JSON.stringify({ text: planResult.text || "I couldn't identify any sub-tasks to execute." }) });
        await stream.writeSSE({
          id: String(id++),
          event: "done",
          data: JSON.stringify({ toolsUsed: [], conversationId: convId, tasks: [], usage: { ...planUsage, durationMs: Math.round(performance.now() - overallStart) } }),
        });
        return;
      }

      // Phase 2: Executing sub-tasks in parallel
      await stream.writeSSE({ id: String(id++), event: "status", data: JSON.stringify({ phase: "executing", tasks: tasks.map((t) => ({ agent: t.agent, query: t.query })) }) });

      const results = await Promise.all(tasks.map((task) => executeTask(task.agent, task.query)));

      for (const r of results) {
        await stream.writeSSE({ id: String(id++), event: "tool-result", data: JSON.stringify({ toolName: `task:${r.agent}`, result: { query: r.query, summary: r.result.response.slice(0, 200) } }) });
      }

      // Phase 3: Synthesis (streaming)
      await stream.writeSSE({ id: String(id++), event: "status", data: JSON.stringify({ phase: "synthesizing" }) });

      const synthesisPrompt = `Here are the results from parallel task execution:\n\n${results.map((r, i) => `Task ${i + 1} (${r.agent}): ${r.query}\nResult: ${r.result.response}`).join("\n\n")}\n\nPlease synthesize these results into a coherent, comprehensive response for the user's original query: "${message}"`;

      const synthesisStart = performance.now();
      const synthesisResult = streamText({ model: getModel(model), prompt: synthesisPrompt });

      for await (const text of synthesisResult.textStream) {
        await stream.writeSSE({ id: String(id++), event: "text-delta", data: JSON.stringify({ text }) });
      }

      const synthesisUsage = await synthesisResult.usage;
      const synthUsageInfo = extractStreamUsage(synthesisUsage, synthesisStart);
      const allToolsUsed = results.flatMap((r) => r.result.toolsUsed);
      const subAgentUsages = results.map((r) => r.result.usage).filter((u): u is UsageInfo => !!u);
      const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthUsageInfo);
      totalUsage.durationMs = Math.round(performance.now() - overallStart);

      await stream.writeSSE({
        id: String(id++),
        event: "done",
        data: JSON.stringify({
          toolsUsed: [...new Set(allToolsUsed)],
          conversationId: convId,
          tasks: results.map((r) => ({ agent: r.agent, query: r.query, summary: r.result.response.slice(0, 200) })),
          usage: totalUsage,
        }),
      });
    });
  },
});
