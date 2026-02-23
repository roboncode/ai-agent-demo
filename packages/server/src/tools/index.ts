import { weatherTool } from "./weather.js";
import {
  hackernewsTopStoriesTool,
  hackernewsStoryDetailTool,
} from "./hackernews.js";
import { movieSearchTool, movieDetailTool } from "./movies.js";
import { searchWebTool } from "./web-search.js";
import { fetchPageTool, getPageMetaTool } from "./web-fetch.js";

export const allTools = {
  getWeather: weatherTool,
  getTopStories: hackernewsTopStoriesTool,
  getStoryDetail: hackernewsStoryDetailTool,
  searchMovies: movieSearchTool,
  getMovieDetail: movieDetailTool,
  searchWeb: searchWebTool,
  fetchPage: fetchPageTool,
  getPageMeta: getPageMetaTool,
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
  searchWebTool,
  fetchPageTool,
  getPageMetaTool,
};

export { toolRegistry } from "../registry/tool-registry.js";
