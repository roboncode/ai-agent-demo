import { weatherTool } from "./weather.js";
import {
  hackernewsTopStoriesTool,
  hackernewsStoryDetailTool,
} from "./hackernews.js";
import { movieSearchTool, movieDetailTool } from "./movies.js";
import {
  createScriptTool,
  updateScriptTool,
  readScriptTool,
  listScriptsTool,
  deleteScriptTool,
  runScriptTool,
} from "./scripts.js";

export const allTools = {
  getWeather: weatherTool,
  getTopStories: hackernewsTopStoriesTool,
  getStoryDetail: hackernewsStoryDetailTool,
  searchMovies: movieSearchTool,
  getMovieDetail: movieDetailTool,
  createScript: createScriptTool,
  updateScript: updateScriptTool,
  readScript: readScriptTool,
  listScripts: listScriptsTool,
  deleteScript: deleteScriptTool,
  runScript: runScriptTool,
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
  createScriptTool,
  updateScriptTool,
  readScriptTool,
  listScriptsTool,
  deleteScriptTool,
  runScriptTool,
};

export { toolRegistry } from "../registry/tool-registry.js";
