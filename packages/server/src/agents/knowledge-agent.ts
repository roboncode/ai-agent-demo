import { generateText, stepCountIs } from "ai";
import { getModel, extractUsage } from "../lib/ai-provider.js";
import { movieSearchTool, movieDetailTool } from "../tools/movies.js";

const SYSTEM_PROMPT = `You are a movie knowledge and recommendation agent. Your job is to help users discover movies, get details, and receive personalized recommendations.

When asked about movies:
1. Use searchMovies to find movies matching the user's interests
2. Use getMovieDetail to provide in-depth information about specific movies
3. Make thoughtful recommendations based on genres, ratings, and user preferences
4. Share interesting facts about movies, directors, and casts

Present information in an engaging, film-critic style. Use ratings and release dates to contextualize recommendations.`;

export async function runKnowledgeAgent(message: string, model?: string) {
  const startTime = performance.now();
  const result = await generateText({
    model: getModel(model),
    system: SYSTEM_PROMPT,
    prompt: message,
    tools: {
      searchMovies: movieSearchTool,
      getMovieDetail: movieDetailTool,
    },
    stopWhen: stepCountIs(5),
  });

  const toolsUsed = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => tc.toolName);

  return {
    response: result.text,
    toolsUsed: [...new Set(toolsUsed)],
    usage: extractUsage(result, startTime),
  };
}
