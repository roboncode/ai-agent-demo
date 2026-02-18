import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getModel, extractUsage, mergeUsage, type UsageInfo } from "../lib/ai-provider.js";
import { runWeatherAgent } from "./weather-agent.js";
import { runHackernewsAgent } from "./hackernews-agent.js";
import { runKnowledgeAgent } from "./knowledge-agent.js";

const SYSTEM_PROMPT = `You are a task delegation agent that breaks complex queries into parallel sub-tasks.

When you receive a complex query that spans multiple domains:
1. Analyze what information is needed
2. Create individual tasks using the createTask tool for each distinct sub-query
3. Tasks will be executed in parallel for efficiency

Available agents for tasks:
- weather: Weather information
- hackernews: Hacker News stories and tech news
- knowledge: Movie information and recommendations

Create one task per distinct information need. Be specific in your task queries.`;

interface TaskResult {
  agent: string;
  query: string;
  result: { response: string; toolsUsed: string[]; usage?: UsageInfo };
}

const createTaskTool = tool({
  description:
    "Create a sub-task to be delegated to a specialist agent. Tasks run in parallel.",
  inputSchema: z.object({
    agent: z
      .enum(["weather", "hackernews", "knowledge"])
      .describe("The specialist agent to handle this task"),
    query: z.string().describe("The specific query for this task"),
  }),
  // Execute is a no-op during planning - actual execution happens after collection
  execute: async ({ agent, query }) => {
    return { agent, query, status: "queued" };
  },
});

async function executeTask(
  agent: string,
  query: string
): Promise<TaskResult> {
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

export async function runTaskAgent(message: string, model?: string) {
  const overallStart = performance.now();

  // Phase 1: Let AI plan the tasks
  const planStart = performance.now();
  const planResult = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: { createTask: createTaskTool },
    stopWhen: stepCountIs(5),
  });
  const planUsage = extractUsage(planResult, planStart);

  // Collect all task proposals
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

  // Aggregate all usage: planning + sub-agents + synthesis
  const subAgentUsages = results
    .map((r) => r.result.usage)
    .filter((u): u is UsageInfo => !!u);

  const totalUsage = mergeUsage(planUsage, ...subAgentUsages, synthesisUsage);
  // Override duration with wall-clock time for the entire operation
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
