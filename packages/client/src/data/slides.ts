import type { SlideConfig } from "../types";

export const slides: SlideConfig[] = [
  // ─── SECTION I: FOUNDATIONS ────────────────────────────────────────────
  {
    id: 1,
    title: "What is an LLM?",
    category: "Foundations",
    section: "I. Foundations",
    bullets: [
      "Large Language Model — a neural network trained on vast text data to predict the next token",
      "Input: a text prompt. Output: a text completion (or structured data)",
      "The model has no memory, no tools, no agency — just text in, text out",
      "Every AI agent starts here: a single API call to a model",
    ],
    code: `POST /api/generate
{
  "prompt": "Explain what an AI agent is in 2-3 sentences.",
  "systemPrompt": "You are a concise technical explainer."
}`,
    demo: {
      type: "json",
      endpoint: "/api/generate",
      systemPrompt: "You are a concise technical explainer.",
      body: {
        prompt: "Explain what an AI agent is in 2-3 sentences.",
        systemPrompt: "You are a concise technical explainer.",
      },
    },
  },

  {
    id: 2,
    title: "Prompts: The Only Interface",
    category: "Foundations",
    section: "I. Foundations",
    bullets: [
      "The system prompt defines who the agent is — its personality, constraints, and capabilities",
      "The user prompt is the task or question — the input that triggers behavior",
      "Prompt engineering is the most impactful lever you have: small wording changes → large behavior changes",
      "Every agent in this demo has a carefully crafted system prompt — they're the source of specialization",
    ],
    code: `// System prompt from the Weather Agent:
"You are a weather specialist agent.
 When asked about weather:
 1. Use the getWeather tool to fetch current conditions
 2. Present the data in a clear, conversational format
 3. Include temperature, conditions, humidity, and wind
 4. Offer practical advice based on conditions"`,
  },

  {
    id: 3,
    title: "Streaming: From Waiting to Watching",
    category: "Foundations",
    section: "I. Foundations",
    bullets: [
      "Standard JSON: wait for entire response → display at once (high latency feel)",
      "Server-Sent Events (SSE): tokens stream as they're generated → real-time display",
      "SSE uses a persistent HTTP connection — each token is an event with data payload",
      "Critical for UX: users see thinking happen, not just a loading spinner",
    ],
    code: `// SSE event stream format:
event: text-delta
data: {"text": "AI "}

event: text-delta
data: {"text": "agents "}

event: done
data: {"usage": {"totalTokens": 142}}`,
    demo: {
      type: "sse",
      endpoint: "/api/generate/stream",
      systemPrompt: "You are a creative poet.",
      body: {
        prompt: "Write a short poem about AI agents working together.",
        systemPrompt: "You are a creative poet.",
      },
    },
  },

  // ─── SECTION II: FROM LLM TO AGENT ────────────────────────────────────
  {
    id: 4,
    title: "LLM vs Agent: What's the Difference?",
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "An LLM is a function: text → text. An agent is a loop: observe → think → act → repeat",
      "The key addition: tools. The LLM can now call functions and use the results",
      "The model decides when to call a tool — it's not hardcoded control flow",
      "Watch: the LLM receives a weather question and autonomously calls getWeather()",
    ],
    code: `POST /api/generate
{
  "prompt": "What is the weather in San Francisco?",
  "tools": ["getWeather"],
  "maxSteps": 3
}`,
    demo: {
      type: "json",
      endpoint: "/api/generate",
      systemPrompt: "(default — none specified)",
      body: {
        prompt: "What is the weather like in San Francisco right now?",
        tools: ["getWeather"],
        maxSteps: 3,
      },
    },
  },

  {
    id: 5,
    title: "What Is a Tool?",
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "A tool is just a function — a name, a description, an input schema, and an execute function",
      "No LLM involved here: we call the tool directly via REST and get structured data back",
      "This is the building block — by itself it's just an API call with validated input/output",
      "Next: we'll see what happens when you give this tool to an agent and let the LLM decide when to use it",
    ],
    code: `// Tool definition (AI SDK + Zod):
const getWeather = tool({
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    return await fetchWeather(location);
  },
});

// Direct call — no LLM needed:
POST /api/tools/weather
{ "location": "San Francisco" }`,
    demo: {
      type: "json",
      endpoint: "/api/tools/weather",
      body: {
        location: "San Francisco",
      },
    },
  },

  {
    id: 6,
    title: "Tools: Giving Your Agent Hands",
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "Now the tool belongs to an agent — the LLM decides when and how to call it",
      "The AI SDK validates tool inputs with Zod schemas before execution",
      "Tools bridge the LLM's knowledge gap: real-time weather, databases, APIs, code execution",
      "The agent loop: call tool → get result → incorporate into response → maybe call another tool",
    ],
    demo: {
      type: "sse",
      endpoint: "/api/agents/weather",
      systemPrompt: "You are a weather specialist agent. Your job is to provide accurate, helpful weather information.\n\nWhen asked about weather:\n1. Use the getWeather tool to fetch current conditions\n2. Present the data in a clear, conversational format\n3. Include temperature, conditions, humidity, and wind info\n4. Offer practical advice based on conditions\n\nAlways use the tool to get real data rather than guessing.",
      body: {
        message:
          "What is the weather like in Tokyo and New York right now? Compare them.",
      },
    },
  },

  {
    id: 7,
    title: "Knowledge Base: External Data Sources",
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "LLMs have a training cutoff — they don't know about recent events or your private data",
      "Knowledge tools connect to external sources: databases, APIs, vector stores, file systems",
      "This demo uses TMDB (movie database) — the agent searches and retrieves movie details",
      "Pattern: give the agent search + detail tools, let it decide what to look up",
    ],
    demo: {
      type: "sse",
      endpoint: "/api/agents/knowledge",
      systemPrompt: "You are a movie knowledge and recommendation agent. Your job is to help users discover movies, get details, and receive personalized recommendations.\n\nWhen asked about movies or TV:\n1. Use searchMovies to find content matching the user's interests\n2. Use getMovieDetail to provide in-depth information\n3. Make thoughtful recommendations based on genres, ratings, and user preferences\n4. Share interesting facts about movies, directors, and casts\n\nPresent information in an engaging, film-critic style.",
      body: {
        message:
          "Who are the top three main characters in the TV show Lost and which actors played them?",
      },
    },
  },

  // ─── SECTION III: AGENT PATTERNS ──────────────────────────────────────
  {
    id: 8,
    title: "Structured Output: JSON, Not Prose",
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "Sometimes you need data, not text — typed JSON objects instead of free-form prose",
      "AI SDK's generateObject() + Zod schema guarantees the output matches your TypeScript types",
      "The model is forced to produce valid JSON conforming to the schema — or it retries",
      "Use case: APIs that return structured data, form generation, data extraction",
    ],
    code: `// Zod schema → guaranteed output shape:
const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string(),
  })),
  steps: z.array(z.object({
    step: z.number(),
    instruction: z.string(),
  })),
});`,
    demo: {
      type: "json",
      endpoint: "/api/agents/recipe",
      systemPrompt: "You are a professional chef and recipe creator. When given a food topic or request, generate a complete, well-structured recipe.",
      body: {
        message: "A quick pasta dish with garlic and cherry tomatoes",
      },
    },
  },

  {
    id: 9,
    title: "Memory & Context",
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "LLMs are stateless — each API call starts fresh with no memory of previous interactions",
      "Memory tools let agents persist and recall information across conversations",
      "This demo: Step 1 saves facts, Step 2 (new request) recalls them — proving persistence",
      "Approaches: file-based JSON, databases, vector stores for semantic search",
    ],
    demo: {
      type: "sse",
      endpoint: "/api/agents/memory",
      systemPrompt: "You are a memory-enabled agent. You can remember information across conversations by saving and recalling memories.\n\nWhen the user tells you to remember something:\n1. Use the saveMemory tool to store the information with a descriptive key\n2. Confirm what you've saved\n\nWhen the user asks about something they previously told you:\n1. Use the recallMemory tool to look up specific information\n2. Use the listMemories tool to see all stored memories if needed\n\nBe proactive about saving relevant preferences, facts, and context the user shares.",
      body: {
        message:
          "Remember that my name is Alex and my favorite programming language is TypeScript.",
      },
    },
  },

  {
    id: 10,
    title: "Guardrails: Keeping Agents On Topic",
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "Problem: users can ask anything — but your agent should only handle its domain",
      "Solution: a classification gate before the main agent — generateObject to categorize the input",
      "If the input is off-topic, reject it immediately without running the expensive main agent",
      "Two-phase: classify (fast, cheap) → generate (slow, expensive, only if allowed)",
    ],
    code: `// Two-phase guardrail pattern:
// Phase 1: Classify input
const { allowed, category } = await generateObject({
  schema: ClassificationSchema,
  prompt: userMessage,
});

// Phase 2: Only run if allowed
if (!allowed) return { blocked: true, reason };
const advice = await generateText({ prompt: userMessage });`,
    demo: {
      type: "json",
      endpoint: "/api/agents/guardrails",
      systemPrompt: "Phase 1: Classify whether the query is a personal finance question. Phase 2: If allowed, generate finance advice.",
      body: {
        message: "How should I start budgeting on a $50k salary?",
      },
      steps: [
        {
          label: "Test 1: In-scope finance question",
          body: {
            message: "How should I start budgeting on a $50k salary?",
          },
        },
        {
          label: "Test 2: Off-topic question (should be blocked)",
          body: {
            message: "What is the best recipe for chocolate cake?",
          },
        },
      ],
    },
  },

  {
    id: 11,
    title: "Human-in-the-Loop",
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "Some actions are too risky for full autonomy: sending emails, deleting data, publishing content",
      "Pattern: the agent proposes an action → human reviews → approves or rejects → agent executes",
      "Two API calls: POST /propose (agent plans) → POST /approve (human decides)",
      "Click Run to see the agent propose sending an email, then Approve or Reject it",
    ],
    demo: {
      type: "multi-step",
      proposeEndpoint: "/api/agents/human-in-loop",
      systemPrompt: "You are an agent that proposes actions for human approval before executing them.\n\nYou MUST ALWAYS use one of the available tools to propose an action. NEVER describe the action in text only.\n\nAvailable tools:\n- sendEmail: Propose sending an email\n- deleteData: Propose deleting data\n- publishContent: Propose publishing content\n\nYou MUST call the appropriate tool. The action will be queued for human review.",
      proposeBody: {
        message:
          "Send an email to john@example.com letting him know the project is ready for review.",
      },
      approveEndpoint: "/api/agents/human-in-loop/approve",
      actionIdPath: "pendingActions[0].id",
    },
  },

  // ─── SECTION IV: ORCHESTRATION ────────────────────────────────────────
  {
    id: 12,
    title: "Supervisor Agent: Routing to Specialists",
    category: "Orchestration",
    section: "IV. Orchestration",
    bullets: [
      "One agent to rule them all: the supervisor analyzes the query and routes to the right specialist",
      "Each specialist has its own tools and system prompt — deep expertise in one domain",
      "The supervisor uses a routeToAgent tool — the LLM decides which agent handles what",
      "Watch: a query about weather AND news gets routed to two different agents",
    ],
    demo: {
      type: "sse",
      endpoint: "/api/agents/supervisor",
      systemPrompt: "You are a supervisor agent that routes user queries to the appropriate specialist agent.\n\nAvailable agents:\n- weather: Handles weather queries\n- hackernews: Handles Hacker News queries\n- knowledge: Handles movie queries\n\nAnalyze the query, route to the appropriate agent(s) using routeToAgent, and synthesize the results. Always use the routeToAgent tool — never answer domain questions directly.",
      body: {
        message:
          "What is the weather in London and what are the top stories on Hacker News today?",
      },
    },
  },

  {
    id: 13,
    title: "Parallel Task Delegation",
    category: "Orchestration",
    section: "IV. Orchestration",
    bullets: [
      "Sequential routing is slow — what if we need 3 different agents?",
      "The task agent creates sub-tasks and runs them in parallel for efficiency",
      "Pattern: break query → create tasks → fan-out to agents → collect results → synthesize",
      "Key benefit: 3 agent calls in parallel vs 3 sequential calls = much faster",
    ],
    demo: {
      type: "sse",
      endpoint: "/api/agents/task",
      systemPrompt: "You are a task delegation agent that breaks complex queries into parallel sub-tasks.\n\nWhen you receive a complex query:\n1. Analyze what information is needed\n2. Create individual tasks using the createTask tool for each distinct sub-query\n3. Tasks will be executed in parallel for efficiency\n\nAvailable agents: weather, hackernews, knowledge. Create one task per distinct information need.",
      body: {
        message:
          "I need three things: the weather in Paris, the top Hacker News story, and a good sci-fi movie recommendation.",
      },
    },
  },

  {
    id: 14,
    title: "Why Build a Custom Agent?",
    category: "Orchestration",
    section: "IV. Orchestration",
    bullets: [
      "ChatGPT, Claude, Gemini are general-purpose — your agent is purpose-built for your domain",
      "You control: which model, which tools, what data it accesses, what it can and cannot do",
      "Custom agents integrate with your systems: databases, internal APIs, business logic",
      "The AI SDK + Hono stack gives you full control with ~50 lines per agent",
    ],
  },

  // ─── SECTION V: PRODUCTION CONCERNS ───────────────────────────────────
  {
    id: 15,
    title: "Security & Auth",
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "Every API route is protected by an X-API-Key header — middleware validates before processing",
      "Watch three attempts: no key (401), wrong key (401), correct key (200)",
      "In production: OAuth2, JWT, rate limiting, input sanitization, output filtering",
      "Never expose your AI provider API key to the client — proxy through your server",
    ],
    code: `// Auth middleware pattern:
app.use("/api/*", async (c, next) => {
  const key = c.req.header("X-API-Key");
  if (key !== env.API_KEY)
    return c.json({ error: "Unauthorized" }, 401);
  await next();
});`,
    demo: {
      type: "json",
      endpoint: "/api/generate",
      body: { prompt: "Say hello in one word." },
      steps: [
        {
          label: "Attempt 1: No API key",
          body: { prompt: "hello" },
          skipAuth: true,
        },
        {
          label: "Attempt 2: Wrong API key",
          body: { prompt: "hello" },
          headers: { "X-API-Key": "wrong-key" },
          skipAuth: true,
        },
        {
          label: "Attempt 3: Correct API key",
          body: { prompt: "Say hello in one word." },
        },
      ],
    },
  },

  {
    id: 16,
    title: "Sandboxes: Running Untrusted Code",
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "The coding agent writes JavaScript and executes it — but how do you run untrusted code safely?",
      "Sandboxing: isolated VM with no file system, no network, no require/import",
      "Node's vm module provides basic isolation; production uses Docker/Firecracker/V8 isolates",
      "Watch: the agent writes code, executes it in a sandbox, and reports the results",
    ],
    demo: {
      type: "sse",
      endpoint: "/api/agents/coding",
      systemPrompt: "You are a coding agent that writes and executes JavaScript code to solve problems.\n\nWhen asked to solve a problem:\n1. Write clear, well-commented JavaScript code\n2. Use the executeCode tool to run it\n3. Analyze the output and present the results\n\nGuidelines: write pure JavaScript (no imports), use console.log() for output, keep code concise. The execution environment is sandboxed with no file system or network access.",
      body: {
        message:
          "Calculate the first 15 numbers in the Fibonacci sequence and tell me which ones are prime.",
      },
    },
  },

  {
    id: 17,
    title: "Observability & Cost",
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "Every API response includes usage stats: input tokens, output tokens, cost, duration",
      "Track per-request costs: GPT-4o-mini is ~$0.15/1M input, $0.60/1M output tokens",
      "Multi-step agents multiply costs: a supervisor routing to 3 agents = 4+ LLM calls",
      "Observability tools: Langfuse, Helicone, custom logging — essential for production",
    ],
    code: `// Usage stats from every response:
{
  "usage": {
    "inputTokens": 847,
    "outputTokens": 231,
    "totalTokens": 1078,
    "cost": 0.000266,
    "durationMs": 2340
  }
}`,
  },

  {
    id: 18,
    title: "MCP: Model Context Protocol",
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "MCP standardizes how AI models connect to external tools and data sources",
      "Like USB for AI: any MCP-compatible tool works with any MCP-compatible model",
      "Server provides tools/resources/prompts; client (your agent) discovers and uses them",
      "Future: your agent auto-discovers available tools instead of hardcoding them",
    ],
    code: `// MCP tool discovery (conceptual):
const tools = await mcpClient.listTools();
// → [{ name: "search", description: "..." },
//    { name: "calendar", description: "..." }]

const result = await mcpClient.callTool("search", {
  query: "quarterly revenue"
});`,
  },

  {
    id: 19,
    title: "Workflows: Putting It All Together",
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "An agent is one node — a workflow chains multiple agents with control flow",
      "Patterns: sequential pipeline, parallel fan-out, conditional branching, human checkpoints",
      "Combine everything: guardrails → supervisor → parallel agents → structured output → human review",
      "The building blocks are simple — the power comes from composition",
    ],
    code: `// Workflow composition:
input
  → guardrail (classify)
  → supervisor (route)
  → parallel: [weather, news, movies]
  → synthesize (structured output)
  → human review (approve/reject)
  → execute`,
  },
];
