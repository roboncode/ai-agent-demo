import type { Context } from "hono";
import { getWeatherDirect } from "../../tools/weather.js";
import {
  getTopStoriesDirect,
  getStoryDetailDirect,
} from "../../tools/hackernews.js";
import {
  searchMoviesDirect,
  getMovieDetailDirect,
} from "../../tools/movies.js";

export async function handleWeather(c: Context) {
  const { location } = await c.req.json();
  const result = await getWeatherDirect(location);
  return c.json(result, 200);
}

export async function handleHackernews(c: Context) {
  const { limit } = await c.req.json();
  const result = await getTopStoriesDirect(limit ?? 10);
  return c.json(result, 200);
}

export async function handleHackernewsStory(c: Context) {
  const storyId = Number(c.req.param("storyId"));
  if (isNaN(storyId)) {
    return c.json({ error: "Invalid story ID" }, 400);
  }
  const result = await getStoryDetailDirect(storyId);
  return c.json(result, 200);
}

export async function handleMovieSearch(c: Context) {
  const { query } = await c.req.json();
  const result = await searchMoviesDirect(query);
  return c.json(result, 200);
}

export async function handleMovieDetail(c: Context) {
  const movieId = Number(c.req.param("movieId"));
  if (isNaN(movieId)) {
    return c.json({ error: "Invalid movie ID" }, 400);
  }
  const result = await getMovieDetailDirect(movieId);
  return c.json(result, 200);
}
