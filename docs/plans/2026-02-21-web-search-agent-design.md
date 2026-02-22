# Web Search Agent Design

## Overview

A new agent that can search the web using the Brave Search API, fetch page content, and extract OpenGraph metadata for rich card display.

## Architecture

Three new files following existing patterns:

```
src/tools/web-search.ts        — searchWeb tool + Brave API integration
src/tools/web-fetch.ts         — fetchPage + getPageMeta tools
src/agents/web-search-agent.ts — agent config, system prompt, self-registration
```

Updates to existing files:

- `src/tools/index.ts` — export new tools
- `src/registry/init.ts` — import new tool/agent files
- `src/agents/supervisor-agent.ts` — add web-search to available agents

## Tools

### searchWeb

- **Input:** `{ query: string, count?: number }` (count defaults to 5, max 10)
- **API:** `https://api.search.brave.com/res/v1/web/search`
- **Auth:** `X-Subscription-Token` header with `BRAVE_API_KEY`
- **Returns:** `{ results: [{ title, url, description, thumbnail? }], query, totalResults }`

### fetchPage

- **Input:** `{ url: string }`
- **Behavior:** Fetches URL, strips HTML to extract readable text via regex (no heavy deps), truncates to ~4000 chars
- **Returns:** `{ url, title, content, contentLength }`

### getPageMeta

- **Input:** `{ url: string }`
- **Behavior:** Fetches URL, parses `<meta>` OG tags from `<head>` only
- **Returns:** `{ url, openGraph: { title, description, image, url, siteName, type } }`
- Client uses this structured data to render rich preview cards

## Agent

### System Prompt Behavior

- Use `searchWeb` first to find relevant results
- Use `fetchPage` when user needs detailed content from a specific page
- Use `getPageMeta` when a rich preview card would be useful (restaurants, articles, products)
- Always cite sources with URLs in responses

### Registration

- Self-registers with `agentRegistry` as `web-search`
- Both SSE and JSON formats via `makeRegistryHandlers`
- Registered as available to supervisor for delegation
- Tool names: `["searchWeb", "fetchPage", "getPageMeta"]`

## Integration with Supervisor

The supervisor agent gets `web-search` added to its available agents list so it can route queries like "search the web for..." or "find me a restaurant..." to this agent.

## OG Card Rendering Strategy

The server returns structured OG data as part of tool results. The client detects OG data in `tool-result` SSE events and renders rich cards. This keeps server focused on data, client on presentation.

## Environment

- `BRAVE_API_KEY` already added to `env.ts` and `.env`
