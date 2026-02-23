# A2UI Slide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an A2UI (Agent-to-User Interface) slide to Section V of the client slide deck, with a live demo that searches for a restaurant via the web-search agent and renders a rich OG card inline in the terminal.

**Architecture:** Introduce a new terminal line type `"og-card"` that carries JSON-encoded OpenGraph data. The demo-runner detects `getPageMeta` tool results during SSE streaming and emits an `og-card` line. TerminalLine routes that type to a new OGCard component. A new A2UIVisual component illustrates the concept on the slide's left panel.

**Tech Stack:** Solid.js, Tailwind CSS v4, TypeScript

---

### Task 1: Add `og-card` to the type system and color map

**Files:**
- Modify: `packages/client/src/types.ts:4-15` (TerminalLineType union)
- Modify: `packages/client/src/lib/terminal-colors.ts:3-15` (typeColorMap)

**Step 1: Add `"og-card"` to the TerminalLineType union**

In `packages/client/src/types.ts`, add `"og-card"` to the union:

```typescript
export type TerminalLineType =
  | "text"
  | "tool-call"
  | "tool-result"
  | "status"
  | "done"
  | "error"
  | "info"
  | "success"
  | "warning"
  | "system-prompt"
  | "user-prompt"
  | "og-card";
```

**Step 2: Add `og-card` to the color map**

In `packages/client/src/lib/terminal-colors.ts`, add the entry to `typeColorMap`:

```typescript
"og-card": "",  // OGCard component handles its own styling
```

**Step 3: Verify TypeScript compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/client/src/types.ts packages/client/src/lib/terminal-colors.ts
git commit -m "feat(client): add og-card terminal line type"
```

---

### Task 2: Create the OGCard component

**Files:**
- Create: `packages/client/src/components/OGCard.tsx`

**Step 1: Create OGCard.tsx**

This component receives a JSON string of OG data from `TerminalLine.content`, parses it, and renders a rich card.

```tsx
import { Show } from "solid-js";
import type { Component } from "solid-js";

interface OGData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  siteName: string | null;
  type: string | null;
}

interface Props {
  data: string; // JSON-encoded OGData
}

const OGCard: Component<Props> = (props) => {
  const og = (): OGData => {
    try {
      return JSON.parse(props.data);
    } catch {
      return { title: null, description: null, image: null, url: "", siteName: null, type: null };
    }
  };

  return (
    <div class="my-3 max-w-md overflow-hidden rounded-lg border border-border bg-raised">
      <Show when={og().image}>
        <div class="h-40 w-full overflow-hidden">
          <img
            src={og().image!}
            alt={og().title ?? ""}
            class="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </Show>

      <div class="p-4">
        <Show when={og().siteName}>
          <span class="mb-1 inline-block rounded-sm bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
            {og().siteName}
          </span>
        </Show>

        <Show when={og().title}>
          <div class="font-mono text-[14px] font-semibold text-heading leading-snug">
            {og().title}
          </div>
        </Show>

        <Show when={og().description}>
          <div class="mt-1.5 font-mono text-[12px] leading-relaxed text-secondary line-clamp-3">
            {og().description}
          </div>
        </Show>

        <Show when={og().url}>
          <a
            href={og().url}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 block truncate font-mono text-[11px] text-accent-dim hover:text-accent transition-colors"
          >
            {og().url}
          </a>
        </Show>
      </div>
    </div>
  );
};

export default OGCard;
```

**Step 2: Verify it compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/client/src/components/OGCard.tsx
git commit -m "feat(client): add OGCard component for rich OpenGraph display"
```

---

### Task 3: Wire OGCard into TerminalLine

**Files:**
- Modify: `packages/client/src/components/TerminalLine.tsx`

**Step 1: Update TerminalLine to render OGCard for og-card lines**

Replace the contents of `packages/client/src/components/TerminalLine.tsx`:

```tsx
import { Show, Switch, Match } from "solid-js";
import type { Component } from "solid-js";
import type { TerminalLine as TLine } from "../types";
import { getLineColorClass } from "../lib/terminal-colors";
import { MarkdownText } from "../lib/markdown";
import OGCard from "./OGCard";

interface Props {
  line: TLine;
}

const TerminalLine: Component<Props> = (props) => {
  return (
    <Switch>
      <Match when={props.line.type === "og-card"}>
        <OGCard data={props.line.content} />
      </Match>
      <Match when={props.line.type === "text"}>
        <div class={`break-words leading-relaxed ${getLineColorClass(props.line.type)}`}>
          <MarkdownText content={props.line.content} />
        </div>
      </Match>
      <Match when={true}>
        <div class={`break-words leading-relaxed ${getLineColorClass(props.line.type)}`}>
          <div class="whitespace-pre-wrap">{props.line.content}</div>
        </div>
      </Match>
    </Switch>
  );
};

export default TerminalLine;
```

This uses Solid's `Switch/Match` to handle three cases: og-card gets OGCard, text gets MarkdownText, everything else gets plain pre-wrap.

**Step 2: Verify it compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/client/src/components/TerminalLine.tsx
git commit -m "feat(client): wire OGCard into TerminalLine rendering"
```

---

### Task 4: Detect OG data in demo-runner and emit og-card lines

**Files:**
- Modify: `packages/client/src/lib/demo-runner.ts:195-197` (tool-result case in runSingleSseStream)

**Step 1: Update the tool-result case**

In `packages/client/src/lib/demo-runner.ts`, replace the `tool-result` case (lines 195-198) inside `runSingleSseStream`:

```typescript
      case "tool-result": {
        cb.addLine("tool-result", formatToolResult(data.toolName, data.result));
        // A2UI: when getPageMeta returns OG data, emit a rich card line
        if (
          data.toolName === "getPageMeta" &&
          data.result?.openGraph &&
          (data.result.openGraph.title || data.result.openGraph.description)
        ) {
          cb.addLine("og-card", JSON.stringify(data.result.openGraph));
        }
        break;
      }
```

This emits the normal `tool-result` line (so the raw data is visible in the terminal), then checks if the tool was `getPageMeta` with meaningful OG data. If so, it emits an additional `og-card` line with the OG payload as JSON. This is the A2UI concept: the agent returns structured data, the client renders a native component.

**Step 2: Verify it compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/client/src/lib/demo-runner.ts
git commit -m "feat(client): emit og-card line when getPageMeta returns OG data"
```

---

### Task 5: Create A2UIVisual component

**Files:**
- Create: `packages/client/src/components/A2UIVisual.tsx`

**Step 1: Create the visual**

This component illustrates the A2UI concept: Agent returns JSON data, the client renders a native component. A simple flow diagram with three steps.

```tsx
import type { Component } from "solid-js";

const ACCENT = "#34d8cc";
const ROSE = "#fb7185";
const AMBER = "#fbbf24";

const steps = [
  {
    num: "1",
    label: "Agent returns structured data",
    detail: '{ title, description, image, url }',
    color: ACCENT,
  },
  {
    num: "2",
    label: "Client receives JSON over SSE",
    detail: "event: tool-result → og-card",
    color: AMBER,
  },
  {
    num: "3",
    label: "Native component renders",
    detail: "<OGCard /> — no HTML from the agent",
    color: ROSE,
  },
];

const A2UIVisual: Component = () => {
  return (
    <div class="mt-8 text-left">
      {steps.map((s, i) => (
        <div class="flex gap-5">
          {/* Step indicator */}
          <div class="flex flex-col items-center">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-mono text-[14px] font-bold"
              style={{
                background: `${s.color}18`,
                border: `1.5px solid ${s.color}50`,
                color: s.color,
              }}
            >
              {s.num}
            </div>
            {i < steps.length - 1 && (
              <div
                class="my-1 w-px flex-1"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>

          {/* Content */}
          <div class="pb-5 pt-1.5">
            <div class="font-mono text-[16px] font-semibold text-primary">
              {s.label}
            </div>
            <div class="mt-0.5 font-mono text-[13px] text-secondary">
              {s.detail}
            </div>
          </div>
        </div>
      ))}

      {/* Trust boundary note */}
      <div class="mt-2 rounded border border-border-subtle px-3 py-2">
        <div class="font-mono text-[12px] text-muted">
          No executable code crosses the trust boundary — only declarative data.
        </div>
      </div>
    </div>
  );
};

export default A2UIVisual;
```

**Step 2: Verify it compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/client/src/components/A2UIVisual.tsx
git commit -m "feat(client): add A2UIVisual component for slide diagram"
```

---

### Task 6: Add the slide definition

**Files:**
- Modify: `packages/client/src/data/slides.ts`

**Step 1: Import the new visual and icon**

At the top of `packages/client/src/data/slides.ts`, add the import after the other visual imports (after line 9):

```typescript
import A2UIVisual from "../components/A2UIVisual";
```

Also add `FiMonitor` to the solid-icons import (this icon represents a UI/display concept — add it to the existing destructured import from `"solid-icons/fi"`).

**Step 2: Add the slide object**

Insert the new slide **after the Workflows slide** (after the object with `id: 19`, before the Conclusion section comment). Place it right before the `// ─── CONCLUSION` comment:

```typescript
  {
    id: 32,
    title: "A2UI: Agent-to-User Interface",
    subtitle: "From JSON to native components",
    icon: FiMonitor,
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "Agents return structured data, not HTML or markdown",
      "Clients render native UI components from that data",
      "A2UI is a declarative protocol — no executable code crosses the trust boundary",
      "Same agent response renders on web, mobile, or desktop",
    ],
    visual: A2UIVisual,
    demoHint: "The web-search agent finds a restaurant and the terminal renders a rich card",
    demo: {
      type: "sse",
      endpoint: "/api/agents/web-search",
      systemPrompt:
        "You are a web search specialist. Search for the requested item, then use getPageMeta to retrieve OpenGraph metadata for a rich preview card.",
      body: {
        message:
          "Find a popular Thai restaurant in Austin TX. Search for one, pick the best result, and get a preview card for it using getPageMeta.",
      },
    },
  },
```

**Step 3: Verify it compiles**

Run: `cd packages/client && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/client/src/data/slides.ts packages/client/src/components/A2UIVisual.tsx
git commit -m "feat(client): add A2UI slide to Section V with web-search demo"
```

---

### Task 7: End-to-end smoke test

**Step 1: Start the server (if not running)**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo && bun run packages/server/src/index.ts`

**Step 2: Start the client dev server (if not running)**

Run: `cd /Users/home/Projects/jombee/ai-agent-demo/packages/client && npx vite`

**Step 3: Navigate to the A2UI slide**

Open the client in a browser. Navigate to the A2UI slide (it will be the last slide in Section V, before the Conclusion). Check:

- [ ] Slide title shows "A2UI: Agent-to-User Interface"
- [ ] Subtitle shows "From JSON to native components"
- [ ] All 4 bullet points render
- [ ] A2UIVisual shows the 3-step flow diagram on the left
- [ ] Demo button is visible

**Step 4: Run the demo**

Click the demo button. Check:

- [ ] SSE stream starts, shows POST endpoint
- [ ] `tool-call` lines appear for searchWeb and getPageMeta
- [ ] `tool-result` line appears for getPageMeta with OG data
- [ ] An OGCard renders inline in the terminal (image, title, description, URL)
- [ ] Agent summary text streams in after the tool calls
- [ ] `done` line appears with token stats

**Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(client): a2ui slide adjustments from smoke test"
```
