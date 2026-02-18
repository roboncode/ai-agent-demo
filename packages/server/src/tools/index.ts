import { weatherTool } from "./weather.js";
import {
  hackernewsTopStoriesTool,
  hackernewsStoryDetailTool,
} from "./hackernews.js";
import { movieSearchTool, movieDetailTool } from "./movies.js";

export const allTools = {
  getWeather: weatherTool,
  getTopStories: hackernewsTopStoriesTool,
  getStoryDetail: hackernewsStoryDetailTool,
  searchMovies: movieSearchTool,
  getMovieDetail: movieDetailTool,
} as const;

export type ToolName = keyof typeof allTools;

export function getToolsByNames(names: ToolName[]) {
  const tools: Record<string, (typeof allTools)[ToolName]> = {};
  for (const name of names) {
    if (allTools[name]) {
      tools[name] = allTools[name];
    }
  }
  return tools;
}

export {
  weatherTool,
  hackernewsTopStoriesTool,
  hackernewsStoryDetailTool,
  movieSearchTool,
  movieDetailTool,
};
