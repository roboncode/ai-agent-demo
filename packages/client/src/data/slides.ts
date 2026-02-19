import type { SlideConfig } from "../types";
import PromptsVisual from "../components/PromptsVisual";
import {
  FiCpu,
  FiMessageSquare,
  FiZap,
  FiRefreshCw,
  FiTool,
  FiGitBranch,
  FiDatabase,
  FiPackage,
  FiBookmark,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiLayers,
  FiTarget,
  FiLock,
  FiBox,
  FiActivity,
  FiLink,
  FiGitMerge,
} from "solid-icons/fi";

export const slides: SlideConfig[] = [
  // ─── SECTION I: FOUNDATIONS ────────────────────────────────────────────
  {
    id: 1,
    title: "What is an LLM?",
    subtitle: "Text in, text out — that's all it does",
    icon: FiCpu,
    category: "Foundations",
    section: "I. Foundations",
    bullets: [
      "A prediction engine: you send text, it guesses what comes next",
      "No memory, no tools, no decisions — just one API call",
    ],
    demoHint: "We send a question and watch the response stream in token by token",
    demo: {
      type: "sse",
      endpoint: "/api/generate/stream",
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
    subtitle: "Words are your only lever",
    icon: FiMessageSquare,
    category: "Foundations",
    section: "I. Foundations",
    bullets: [
      "Small wording changes cause big behavior changes",
    ],
    visual: PromptsVisual,
  },

  {
    id: 3,
    title: "Streaming",
    subtitle: "See thinking happen in real time",
    icon: FiZap,
    category: "Foundations",
    section: "I. Foundations",
    bullets: [
      "Without streaming: wait... wait... wall of text",
      "With streaming: words appear as the AI thinks them",
    ],
    demoHint: "Words flow in one at a time instead of all at once",
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
    title: "LLM vs Agent",
    subtitle: "From a calculator to an assistant",
    icon: FiRefreshCw,
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "An LLM answers questions. An agent takes actions.",
      "The secret ingredient: tools the AI can call on its own",
    ],
    demoHint: "The AI decides it needs weather data and fetches it autonomously",
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
    subtitle: "A function with a name tag",
    icon: FiTool,
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "A tool is just a function: a name, a description, and input rules",
      "Here we call one directly — no AI involved yet",
    ],
    demoHint: "We call a weather tool directly — plain function, plain data",
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
    title: "Giving Your Agent Hands",
    subtitle: "The AI decides when to reach for a tool",
    icon: FiGitBranch,
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "The agent sees a question, picks the right tool, uses the result",
      "Observe, think, act, repeat",
    ],
    demoHint: "The agent compares weather in two cities — calling the tool twice",
    demo: {
      type: "sse",
      endpoint: "/api/agents/weather",
      systemPrompt:
        "You are a weather specialist agent. Your job is to provide accurate, helpful weather information.\n\nWhen asked about weather:\n1. Use the getWeather tool to fetch current conditions\n2. Present the data in a clear, conversational format\n3. Include temperature, conditions, humidity, and wind info\n4. Offer practical advice based on conditions\n\nAlways use the tool to get real data rather than guessing.",
      body: {
        message:
          "What is the weather like in Tokyo and New York right now? Compare them.",
      },
    },
  },

  {
    id: 7,
    title: "Knowledge Base",
    subtitle: "Give it a library card",
    icon: FiDatabase,
    category: "From LLM to Agent",
    section: "II. From LLM to Agent",
    bullets: [
      "LLMs have a training cutoff — they can't know recent or private data",
      "Knowledge tools let agents search external sources on the fly",
    ],
    demoHint: "The agent searches a movie database to answer a question",
    demo: {
      type: "sse",
      endpoint: "/api/agents/knowledge",
      systemPrompt:
        "You are a movie knowledge and recommendation agent. Your job is to help users discover movies, get details, and receive personalized recommendations.\n\nWhen asked about movies or TV:\n1. Use searchMovies to find content matching the user's interests\n2. Use getMovieDetail to provide in-depth information\n3. Make thoughtful recommendations based on genres, ratings, and user preferences\n4. Share interesting facts about movies, directors, and casts\n\nPresent information in an engaging, film-critic style.",
      body: {
        message:
          "Who are the top three main characters in the TV show Lost and which actors played them?",
      },
    },
  },

  // ─── SECTION III: AGENT PATTERNS ──────────────────────────────────────
  {
    id: 8,
    title: "Structured Output",
    subtitle: "When you need data, not paragraphs",
    icon: FiPackage,
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "You define the shape — the AI fills it in",
      "Guaranteed valid JSON, not freeform text you have to parse",
    ],
    demoHint: "We ask for a recipe and get back structured JSON",
    demo: {
      type: "json",
      endpoint: "/api/agents/recipe",
      systemPrompt:
        "You are a professional chef and recipe creator. When given a food topic or request, generate a complete, well-structured recipe.",
      body: {
        message: "A quick pasta dish with garlic and cherry tomatoes",
      },
    },
  },

  {
    id: 9,
    title: "Memory & Context",
    subtitle: "Every call starts fresh — unless you give it a notebook",
    icon: FiBookmark,
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "LLMs are stateless: they forget everything between calls",
      "Memory tools save and recall facts across conversations",
    ],
    demoHint: "Step 1 saves facts. Step 2 recalls them — proving persistence",
    demo: {
      type: "sse",
      endpoint: "/api/agents/memory",
      systemPrompt:
        "You are a memory-enabled agent. You can remember information across conversations by saving and recalling memories.\n\nWhen the user tells you to remember something:\n1. Use the saveMemory tool to store the information with a descriptive key\n2. Confirm what you've saved\n\nWhen the user asks about something they previously told you:\n1. Use the recallMemory tool to look up specific information\n2. Use the listMemories tool to see all stored memories if needed\n\nBe proactive about saving relevant preferences, facts, and context the user shares.",
      body: {
        message:
          "Remember that my name is Alex and my favorite programming language is TypeScript.",
      },
    },
  },

  {
    id: 10,
    title: "Guardrails",
    subtitle: "A bouncer at the door",
    icon: FiShield,
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "Problem: Users can ask anything. Your agent should only handle its domain.",
      "Solution: A fast classifier checks before the expensive agent runs",
    ],
    demoHint: "A finance question gets through. A cake recipe gets blocked.",
    demo: {
      type: "sse",
      endpoint: "/api/agents/guardrails/stream",
      systemPrompt:
        "Phase 1: Classify whether the query is a personal finance question.\nPhase 2: If allowed, stream finance advice.",
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
    subtitle: "Trust, but verify",
    icon: FiUserCheck,
    category: "Agent Patterns",
    section: "III. Agent Patterns",
    bullets: [
      "Some actions are too risky for full autonomy",
      "The agent proposes, a human approves or rejects, then it executes",
    ],
    demoHint: "The agent proposes sending an email — you decide if it happens",
    demo: {
      type: "multi-step",
      proposeEndpoint: "/api/agents/human-in-loop/stream",
      systemPrompt:
        "You are an agent that proposes actions for human approval before executing them.\n\nYou MUST ALWAYS use one of the available tools to propose an action. NEVER describe the action in text only.\n\nAvailable tools:\n- sendEmail: Propose sending an email\n- deleteData: Propose deleting data\n- publishContent: Propose publishing content\n\nYou MUST call the appropriate tool. The action will be queued for human review.",
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
    title: "Supervisor Agent",
    subtitle: "One manager, many experts",
    icon: FiUsers,
    category: "Orchestration",
    section: "IV. Orchestration",
    bullets: [
      "A supervisor reads your question and picks the right specialist",
      "Each specialist has its own tools and deep expertise",
    ],
    demoHint: "A question about weather AND news gets routed to two agents",
    demo: {
      type: "sse",
      endpoint: "/api/agents/supervisor",
      systemPrompt:
        "You are a supervisor agent that routes user queries to the appropriate specialist agent.\n\nAvailable agents:\n- weather: Handles weather queries\n- hackernews: Handles Hacker News queries\n- knowledge: Handles movie queries\n\nAnalyze the query, route to the appropriate agent(s) using routeToAgent, and synthesize the results. Always use the routeToAgent tool — never answer domain questions directly.",
      body: {
        message:
          "What is the weather in London and what are the top stories on Hacker News today?",
      },
    },
  },

  {
    id: 13,
    title: "Parallel Tasks",
    subtitle: "Why wait in line when you can fan out?",
    icon: FiLayers,
    category: "Orchestration",
    section: "IV. Orchestration",
    bullets: [
      "Break a complex question into sub-tasks, run them all at once",
      "Three agents in parallel vs one at a time — much faster",
    ],
    demoHint: "Weather, news, and movies fetched simultaneously",
    demo: {
      type: "sse",
      endpoint: "/api/agents/task",
      systemPrompt:
        "You are a task delegation agent that breaks complex queries into parallel sub-tasks.\n\nWhen you receive a complex query:\n1. Analyze what information is needed\n2. Create individual tasks using the createTask tool for each distinct sub-query\n3. Tasks will be executed in parallel for efficiency\n\nAvailable agents: weather, hackernews, knowledge. Create one task per distinct information need.",
      body: {
        message:
          "I need three things: the weather in Paris, the top Hacker News story, and a good sci-fi movie recommendation.",
      },
    },
  },

  {
    id: 14,
    title: "Why Custom Agents?",
    subtitle: "General-purpose AI vs. your domain expert",
    icon: FiTarget,
    category: "Orchestration",
    section: "IV. Orchestration",
    bullets: [
      "ChatGPT is a generalist. Your agent is purpose-built for your problem.",
      "You control: which model, which tools, what data, what guardrails",
    ],
  },

  // ─── SECTION V: PRODUCTION CONCERNS ───────────────────────────────────
  {
    id: 15,
    title: "Security & Auth",
    subtitle: "Lock the front door",
    icon: FiLock,
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "Every request must prove who it is before the agent responds",
      "Never expose your AI provider keys to the client",
    ],
    demoHint: "Three attempts: no key, wrong key, correct key",
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
    title: "Sandboxes",
    subtitle: "Let it code, but in a padded room",
    icon: FiBox,
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "When an agent writes code, you need a safe place to run it",
      "Sandboxes: isolated execution, no file system or network access",
    ],
    demoHint: "The agent writes code, runs it in a sandbox, reports results",
    demo: {
      type: "sse",
      endpoint: "/api/agents/coding",
      systemPrompt:
        "You are a coding agent that writes and executes JavaScript code to solve problems.\n\nWhen asked to solve a problem:\n1. Write clear, well-commented JavaScript code\n2. Use the executeCode tool to run it\n3. Analyze the output and present the results\n\nGuidelines: write pure JavaScript (no imports), use console.log() for output, keep code concise. The execution environment is sandboxed with no file system or network access.",
      body: {
        message:
          "Calculate the first 15 numbers in the Fibonacci sequence and tell me which ones are prime.",
      },
    },
  },

  {
    id: 17,
    title: "Observability & Cost",
    subtitle: "If you can't measure it, you can't manage it",
    icon: FiActivity,
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "Every call has a cost: track tokens, latency, and dollars",
      "Multi-step agents multiply costs — a supervisor + 3 agents = 4+ calls",
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
    title: "MCP",
    subtitle: "USB-C for AI tools",
    icon: FiLink,
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "A standard for AI to discover and use tools — no hardcoding",
      "Any MCP-compatible tool works with any MCP-compatible agent",
    ],
    code: `// MCP tool discovery:
const tools = await mcp.listTools();
// → [{ name: "search", ... },
//    { name: "calendar", ... }]

const result = await mcp.callTool("search", {
  query: "quarterly revenue"
});`,
  },

  {
    id: 19,
    title: "Workflows",
    subtitle: "Simple blocks, powerful compositions",
    icon: FiGitMerge,
    category: "Production",
    section: "V. Production Concerns",
    bullets: [
      "An agent is one step. A workflow chains agents with logic.",
      "Combine: guardrails, routing, parallel work, structured output, human review",
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
