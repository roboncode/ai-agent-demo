import { tool } from "ai";
import { z } from "zod";
import { env } from "../env.js";
import { toolRegistry } from "../registry/tool-registry.js";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

export const searchWebTool = tool({
  description:
    "Search the web using Brave Search. Returns a list of results with titles, URLs, and descriptions.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    count: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("Number of results to return (1-10, default 5)"),
  }),
  execute: async ({ query, count }) => {
    const params = new URLSearchParams({
      q: query,
      count: String(count ?? 5),
    });

    const res = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": env.BRAVE_API_KEY,
      },
    });

    if (!res.ok) {
      throw new Error(`Brave Search failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const webResults = data.web?.results ?? [];

    return {
      query,
      totalResults: data.web?.totalResults ?? 0,
      results: webResults.map(
        (r: {
          title: string;
          url: string;
          description: string;
          thumbnail?: { src: string };
        }) => ({
          title: r.title,
          url: r.url,
          description: r.description,
          ...(r.thumbnail?.src && { thumbnail: r.thumbnail.src }),
        })
      ),
    };
  },
});

export async function searchWebDirect(query: string, count = 5) {
  return searchWebTool.execute!({ query, count }, { toolCallId: "direct" } as any);
}

// Self-registration
toolRegistry.register({
  name: "searchWeb",
  description: "Search the web using Brave Search",
  inputSchema: z.object({
    query: z.string(),
    count: z.number().optional(),
  }),
  tool: searchWebTool,
  directExecute: (input: { query: string; count?: number }) =>
    searchWebDirect(input.query, input.count),
  category: "web",
});
