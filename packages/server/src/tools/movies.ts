import { tool } from "ai";
import { z } from "zod";
import { env } from "../env.js";
import { toolRegistry } from "../registry/tool-registry.js";

const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${env.TMDB_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export const movieSearchTool = tool({
  description:
    "Search for movies by title, keywords, or description. Returns a list of matching movies with ratings.",
  inputSchema: z.object({
    query: z.string().describe("Movie search query (title, keywords, etc.)"),
  }),
  execute: async ({ query }) => {
    if (!env.TMDB_API_KEY) {
      return { error: "TMDB_API_KEY not configured", movies: [] };
    }

    const response = await fetch(
      `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`,
      { headers: tmdbHeaders() }
    );

    if (!response.ok) throw new Error(`TMDB API error: ${response.statusText}`);

    const data = await response.json();

    return {
      movies: (data.results ?? []).slice(0, 10).map((m: any) => ({
        id: m.id,
        title: m.title,
        overview: m.overview?.slice(0, 200) ?? "",
        releaseDate: m.release_date ?? null,
        voteAverage: m.vote_average,
        voteCount: m.vote_count,
        posterPath: m.poster_path
          ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : null,
      })),
      totalResults: data.total_results,
    };
  },
});

export const movieDetailTool = tool({
  description:
    "Get detailed information about a specific movie by its TMDB ID.",
  inputSchema: z.object({
    movieId: z.number().describe("The TMDB movie ID"),
  }),
  execute: async ({ movieId }) => {
    if (!env.TMDB_API_KEY) {
      return { error: "TMDB_API_KEY not configured" };
    }

    const response = await fetch(
      `${TMDB_BASE}/movie/${movieId}?language=en-US`,
      { headers: tmdbHeaders() }
    );

    if (!response.ok) throw new Error(`TMDB API error: ${response.statusText}`);

    const m = await response.json();

    return {
      id: m.id,
      title: m.title,
      tagline: m.tagline ?? "",
      overview: m.overview ?? "",
      releaseDate: m.release_date ?? null,
      runtime: m.runtime,
      genres: (m.genres ?? []).map((g: any) => g.name),
      voteAverage: m.vote_average,
      voteCount: m.vote_count,
      budget: m.budget,
      revenue: m.revenue,
      posterPath: m.poster_path
        ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
        : null,
      homepage: m.homepage ?? null,
    };
  },
});

export async function searchMoviesDirect(query: string) {
  return movieSearchTool.execute!({ query }, { toolCallId: "direct" } as any);
}

export async function getMovieDetailDirect(movieId: number) {
  return movieDetailTool.execute!({ movieId }, { toolCallId: "direct" } as any);
}

// Self-registration
toolRegistry.register({
  name: "searchMovies",
  description: "Search for movies by title, keywords, or description",
  inputSchema: z.object({ query: z.string() }),
  tool: movieSearchTool,
  directExecute: (input: { query: string }) => searchMoviesDirect(input.query),
  category: "movies",
});

toolRegistry.register({
  name: "getMovieDetail",
  description: "Get detailed information about a specific movie",
  inputSchema: z.object({ movieId: z.number() }),
  tool: movieDetailTool,
  directExecute: (input: { movieId: number }) => getMovieDetailDirect(input.movieId),
  category: "movies",
});
