import { generateText, stepCountIs } from "ai";
import { getModel } from "../lib/ai-provider.js";
import {
  hackernewsTopStoriesTool,
  hackernewsStoryDetailTool,
} from "../tools/hackernews.js";

const SYSTEM_PROMPT = `You are a Hacker News analyst agent. Your job is to help users discover and understand trending tech stories.

When asked about Hacker News:
1. Use getTopStories to fetch current top stories
2. Use getStoryDetail to dive deeper into specific stories if asked
3. Provide summaries, highlight interesting trends, and share insights
4. Note high-scoring stories and active discussions

Present information in an engaging, tech-news style.`;

export async function runHackernewsAgent(message: string, model?: string) {
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: {
      getTopStories: hackernewsTopStoriesTool,
      getStoryDetail: hackernewsStoryDetailTool,
    },
    stopWhen: stepCountIs(5),
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
  };
}
