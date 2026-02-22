# Web Search Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a web search agent with Brave Search, page fetching, and OpenGraph extraction tools.

**Architecture:** Three new tools (`searchWeb`, `fetchPage`, `getPageMeta`) in two tool files, one agent file that self-registers with the agent registry. The supervisor auto-discovers routable agents, so no supervisor changes needed.

**Tech Stack:** Vercel AI SDK v6 `tool()`, Brave Search API, Zod schemas, Bun runtime

---

### Task 1: Create the searchWeb tool

**Files:**
- Create: `packages/server/src/tools/web-search.ts`

**Step 1: Create the searchWeb tool file**

```typescript
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
```

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo && bunx tsc --noEmit --pretty 2>&1 | grep -i "web-search" || echo "No errors in web-search.ts"`

**Step 3: Commit**

```bash
git add packages/server/src/tools/web-search.ts
git commit -m "feat: add searchWeb tool with Brave Search API integration"
```

---

### Task 2: Create the fetchPage and getPageMeta tools

**Files:**
- Create: `packages/server/src/tools/web-fetch.ts`

**Step 1: Create the web-fetch tool file**

```typescript
import { tool } from "ai";
import { z } from "zod";
import { toolRegistry } from "../registry/tool-registry.js";

const MAX_CONTENT_LENGTH = 4000;
const FETCH_TIMEOUT_MS = 10000;

/**
 * Strip HTML tags and extract readable text.
 * Lightweight regex-based approach — no external deps.
 */
function htmlToText(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Convert common block elements to newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract <title> from HTML.
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract OpenGraph meta tags from the <head> section.
 */
function extractOpenGraph(html: string): Record<string, string> {
  const og: Record<string, string> = {};
  // Only look in <head> to avoid false matches in body
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const head = headMatch ? headMatch[0] : html.slice(0, 5000);

  const metaRegex =
    /<meta\s+(?=[^>]*property=["']og:([^"']+)["'])(?=[^>]*content=["']([^"']*)["'])[^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(head)) !== null) {
    og[match[1]] = match[2];
  }

  // Also try reversed attribute order: content before property
  const metaRegexReversed =
    /<meta\s+(?=[^>]*content=["']([^"']*)["'])(?=[^>]*property=["']og:([^"']+)["'])[^>]*\/?>/gi;
  while ((match = metaRegexReversed.exec(head)) !== null) {
    if (!og[match[2]]) {
      og[match[2]] = match[1];
    }
  }

  return og;
}

export const fetchPageTool = tool({
  description:
    "Fetch a web page and extract its readable text content. Use this to get detailed information from a specific URL found via search.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the page to fetch"),
  }),
  execute: async ({ url }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIAgentBot/1.0; +https://github.com/ai-agent-demo)",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
      }

      const html = await res.text();
      const title = extractTitle(html);
      let content = htmlToText(html);
      const fullLength = content.length;

      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.slice(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated]";
      }

      return {
        url,
        title: title ?? "Untitled",
        content,
        contentLength: fullLength,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});

export const getPageMetaTool = tool({
  description:
    "Extract OpenGraph metadata from a web page for rich card display. Returns structured data including title, description, image URL, and site name.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to extract OpenGraph metadata from"),
  }),
  execute: async ({ url }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIAgentBot/1.0; +https://github.com/ai-agent-demo)",
          Accept: "text/html,application/xhtml+xml,*/*",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
      }

      const html = await res.text();
      const og = extractOpenGraph(html);
      const title = extractTitle(html);

      return {
        url,
        openGraph: {
          title: og.title ?? title ?? null,
          description: og.description ?? null,
          image: og.image ?? null,
          url: og.url ?? url,
          siteName: og.site_name ?? null,
          type: og.type ?? null,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});

export async function fetchPageDirect(url: string) {
  return fetchPageTool.execute!({ url }, { toolCallId: "direct" } as any);
}

export async function getPageMetaDirect(url: string) {
  return getPageMetaTool.execute!({ url }, { toolCallId: "direct" } as any);
}

// Self-registration
toolRegistry.register({
  name: "fetchPage",
  description: "Fetch a web page and extract readable text content",
  inputSchema: z.object({ url: z.string().url() }),
  tool: fetchPageTool,
  directExecute: (input: { url: string }) => fetchPageDirect(input.url),
  category: "web",
});

toolRegistry.register({
  name: "getPageMeta",
  description: "Extract OpenGraph metadata from a web page",
  inputSchema: z.object({ url: z.string().url() }),
  tool: getPageMetaTool,
  directExecute: (input: { url: string }) => getPageMetaDirect(input.url),
  category: "web",
});
```

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo && bunx tsc --noEmit --pretty 2>&1 | grep -i "web-fetch" || echo "No errors in web-fetch.ts"`

**Step 3: Commit**

```bash
git add packages/server/src/tools/web-fetch.ts
git commit -m "feat: add fetchPage and getPageMeta tools for page content and OG extraction"
```

---

### Task 3: Register tools in index and init

**Files:**
- Modify: `packages/server/src/tools/index.ts`
- Modify: `packages/server/src/registry/init.ts`

**Step 1: Add new tools to `src/tools/index.ts`**

Add imports at the top alongside existing ones:

```typescript
import { searchWebTool } from "./web-search.js";
import { fetchPageTool, getPageMetaTool } from "./web-fetch.js";
```

Add to `allTools` object:

```typescript
searchWeb: searchWebTool,
fetchPage: fetchPageTool,
getPageMeta: getPageMetaTool,
```

Add to the named re-exports at the bottom:

```typescript
export {
  // ...existing exports...
  searchWebTool,
  fetchPageTool,
  getPageMetaTool,
};
```

**Step 2: Add imports to `src/registry/init.ts`**

Add to the tool imports `Promise.all` (around line 7-11):

```typescript
import("../tools/web-search.js"),
import("../tools/web-fetch.js"),
```

**Step 3: Verify no TypeScript errors**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo && bunx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add packages/server/src/tools/index.ts packages/server/src/registry/init.ts
git commit -m "feat: register web search and fetch tools in index and init"
```

---

### Task 4: Create the web-search agent

**Files:**
- Create: `packages/server/src/agents/web-search-agent.ts`

**Step 1: Create the agent file**

```typescript
import { runAgent } from "../lib/run-agent.js";
import { searchWebTool } from "../tools/web-search.js";
import { fetchPageTool, getPageMetaTool } from "../tools/web-fetch.js";
import { agentRegistry } from "../registry/agent-registry.js";
import { makeRegistryHandlers } from "../registry/handler-factories.js";

const SYSTEM_PROMPT = `You are a web search specialist agent. Your job is to find information on the internet and provide accurate, well-sourced answers.

You have three tools:

1. **searchWeb** — Search the web for a query. Use this first to find relevant results.
2. **fetchPage** — Fetch and extract readable text from a specific URL. Use this when you need detailed content from a page (e.g., menus, full articles, product details).
3. **getPageMeta** — Extract OpenGraph metadata from a URL. Use this when a rich preview card would be helpful (restaurants, articles, products, businesses).

Workflow:
1. Start with searchWeb to find relevant results
2. If the user needs specific details from a page, use fetchPage on the most relevant URLs
3. If the user would benefit from a visual preview card, use getPageMeta on key URLs
4. Synthesize the information into a clear, helpful response

Always:
- Cite your sources with URLs
- Be upfront if search results are limited or inconclusive
- Use fetchPage selectively — only on the most relevant 1-2 URLs, not every result`;

const tools = {
  searchWeb: searchWebTool,
  fetchPage: fetchPageTool,
  getPageMeta: getPageMetaTool,
};

export const WEB_SEARCH_AGENT_CONFIG = {
  system: SYSTEM_PROMPT,
  tools,
};

export const runWebSearchAgent = (message: string, model?: string) =>
  runAgent(WEB_SEARCH_AGENT_CONFIG, message, model);

// Self-registration
agentRegistry.register({
  name: "web-search",
  description:
    "Web search specialist agent using Brave Search — can search the web, fetch page content, and extract OpenGraph metadata",
  toolNames: ["searchWeb", "fetchPage", "getPageMeta"],
  defaultFormat: "sse",
  defaultSystem: SYSTEM_PROMPT,
  tools,
  ...makeRegistryHandlers({ tools }),
});
```

**Step 2: Add agent import to `src/registry/init.ts`**

Add to the agent imports `Promise.all` (around line 14-25):

```typescript
import("../agents/web-search-agent.js"),
```

**Step 3: Verify no TypeScript errors**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo && bunx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add packages/server/src/agents/web-search-agent.ts packages/server/src/registry/init.ts
git commit -m "feat: add web-search agent with Brave Search, page fetch, and OG extraction"
```

---

### Task 5: Smoke test the agent

**Step 1: Start the server**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo && bun run packages/server/src/index.ts`

Expected: Server starts, registry logs show the new agent (agent count should be 1 higher than before).

**Step 2: Verify agent appears in the agent list**

Run: `curl -s -H "X-API-Key: demo" http://localhost:3000/api/agents | jq '.agents[] | select(.name == "web-search")'`

Expected: JSON with name "web-search", toolNames ["searchWeb", "fetchPage", "getPageMeta"], formats ["json", "sse"].

**Step 3: Test a search query (JSON format)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/agents/web-search?format=json \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo" \
  -d '{"message": "What is the latest news about AI agents?"}' | jq '{response: .response[:200], toolsUsed}'
```

Expected: Response with text containing search results, toolsUsed includes "searchWeb".

**Step 4: Test via supervisor (delegation)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/agents/supervisor?format=json \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo" \
  -d '{"message": "Search the web for the best Thai restaurants in Austin TX"}' | jq '{response: .response[:200], toolsUsed, agentsUsed}'
```

Expected: `agentsUsed` includes "web-search".

**Step 5: Commit (if any fixes were needed)**

Only commit if adjustments were made during testing.
