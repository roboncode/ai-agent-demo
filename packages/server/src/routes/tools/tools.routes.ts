import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../app.js";
import {
  weatherRequestSchema,
  hackernewsRequestSchema,
  movieSearchRequestSchema,
} from "./tools.schemas.js";
import * as handlers from "./tools.handlers.js";

const router = createRouter();

// POST /weather
router.openapi(
  createRoute({
    method: "post",
    path: "/weather",
    tags: ["Tools"],
    summary: "Get weather data for a location",
    request: {
      body: {
        content: {
          "application/json": { schema: weatherRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Weather data",
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
  }),
  handlers.handleWeather
);

// POST /hackernews
router.openapi(
  createRoute({
    method: "post",
    path: "/hackernews",
    tags: ["Tools"],
    summary: "Get top Hacker News stories",
    request: {
      body: {
        content: {
          "application/json": { schema: hackernewsRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Top stories list",
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
  }),
  handlers.handleHackernews
);

// GET /hackernews/:storyId
router.openapi(
  createRoute({
    method: "get",
    path: "/hackernews/{storyId}",
    tags: ["Tools"],
    summary: "Get Hacker News story details",
    request: {
      params: z.object({ storyId: z.string().openapi({ example: "12345" }) }),
    },
    responses: {
      200: {
        description: "Story details",
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
  }),
  handlers.handleHackernewsStory
);

// POST /movies/search
router.openapi(
  createRoute({
    method: "post",
    path: "/movies/search",
    tags: ["Tools"],
    summary: "Search for movies",
    request: {
      body: {
        content: {
          "application/json": { schema: movieSearchRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Movie search results",
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
  }),
  handlers.handleMovieSearch
);

// GET /movies/:movieId
router.openapi(
  createRoute({
    method: "get",
    path: "/movies/{movieId}",
    tags: ["Tools"],
    summary: "Get movie details",
    request: {
      params: z.object({ movieId: z.string().openapi({ example: "550" }) }),
    },
    responses: {
      200: {
        description: "Movie details",
        content: { "application/json": { schema: z.object({}).passthrough() } },
      },
    },
  }),
  handlers.handleMovieDetail
);

export default router;
