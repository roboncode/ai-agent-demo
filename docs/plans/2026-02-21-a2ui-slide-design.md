# A2UI Slide Design

## Overview

Add a new slide to the client's Section V (Production) demonstrating the A2UI (Agent-to-User Interface) concept. The demo calls the web search agent to find a restaurant, and when OpenGraph metadata arrives, the terminal renders a rich card component inline — showing the A2UI concept in action.

## Slide Definition

- **Position:** Section V (Production), after existing slides
- **Title:** "A2UI: Agent-to-User Interface"
- **Subtitle:** "From JSON to native components"
- **Category:** "Production"
- **Section:** "V. Production"
- **Bullets:**
  - Agents return structured data, not HTML or markdown
  - Clients render native UI components from that data
  - A2UI is a declarative protocol — no executable code crosses the trust boundary
  - Same agent response renders on web, mobile, or desktop
- **Visual:** Custom `A2UIVisual` component
- **Demo:** SSE to `/api/agents/web-search` asking about a Thai restaurant in Austin

## New Components

### OGCard.tsx

Renders a rich preview card from OpenGraph metadata. Styled for the dark terminal theme with:
- Image banner (if available)
- Title (bold)
- Description (muted text)
- URL link
- Site name badge
- Gradient border and glow matching the app's accent colors

### A2UIVisual.tsx

Custom visual for the left side of the slide. Shows the A2UI concept:
- Agent returns structured JSON data
- Client renders it as a native component
- Visual flow diagram: Agent → Data → Component

## Terminal Enhancement

### New line type: "og-card"

- Add `"og-card"` to `TerminalLineType` union in `types.ts`
- `TerminalLine.tsx` detects `og-card` type and renders `OGCard` component
- Content is JSON-encoded OG data: `{ title, description, image, url, siteName, type }`

### Demo runner change

In `demo-runner.ts`, when processing `tool-result` events:
- Check if `toolName === "getPageMeta"` and the result contains `openGraph` data
- If so, emit an `og-card` line with the OG data as JSON content
- Also emit the normal `tool-result` line (so both raw and rich are visible)

## Data Flow

```
User clicks demo button
  → SSE POST /api/agents/web-search { message: "Find a popular Thai restaurant in Austin TX and get a preview card" }
  → tool-call: searchWeb → tool-result: search results (normal terminal lines)
  → tool-call: getPageMeta → tool-result: OG data
  → demo-runner detects OG data → emits "og-card" line with structured data
  → TerminalLine renders OGCard component inline
  → text-delta: agent summary with citations
```
