import { runAgent } from "../lib/run-agent.js";
import {
  hackernewsTopStoriesTool,
  hackernewsStoryDetailTool,
} from "../tools/hackernews.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { makeRegistryStreamHandler } from "../registry/handler-factories.js";

const SYSTEM_PROMPT = `You are a Hacker News analyst agent. Your job is to help users discover and understand trending tech stories.

When asked about Hacker News:
1. Use getTopStories to fetch current top stories
2. Use getStoryDetail to dive deeper into specific stories if asked
3. Provide summaries, highlight interesting trends, and share insights
4. Note high-scoring stories and active discussions

Present information in an engaging, tech-news style.`;

export const HACKERNEWS_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools: {
    getTopStories: hackernewsTopStoriesTool,
    getStoryDetail: hackernewsStoryDetailTool,
  },
};

export const runHackernewsAgent = (message: string, model?: string) =>
  runAgent(HACKERNEWS_AGENT_CONFIG, message, model);

// Self-registration
agentRegistry.register({
  name: "hackernews",
  description: "Hacker News analyst agent for trending stories and tech news",
  toolNames: ["getTopStories", "getStoryDetail"],
  type: "stream",
  defaultSystem: SYSTEM_PROMPT,
  handler: makeRegistryStreamHandler({
    tools: { getTopStories: hackernewsTopStoriesTool, getStoryDetail: hackernewsStoryDetailTool },
  }),
});
