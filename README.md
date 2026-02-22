# AI Agent Demo

Companion code for the **"Building AI Agents"** presentation. A full-stack monorepo that demonstrates progressively complex AI agent patterns — from simple text generation to multi-agent orchestration, human-in-the-loop workflows, and persistent memory.

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | [Bun](https://bun.sh) |
| Server | [Hono](https://hono.dev) + [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) |
| AI | [Vercel AI SDK v6](https://ai-sdk.dev) + [OpenRouter](https://openrouter.ai) |
| Client | [SolidJS](https://www.solidjs.com) + [Tailwind CSS](https://tailwindcss.com) |
| Docs | Auto-generated OpenAPI via [Scalar](https://scalar.com) at `/reference` |

## Prerequisites

Install [Bun](https://bun.sh) by going to the website or running the following command:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Getting Started

```bash
# Clone the repo
git clone <repo-url> && cd ai-agent-demo

# Install dependencies (workspaces resolve automatically)
bun install

# Copy the example env and add your keys
cp packages/server/.env.example packages/server/.env

# Start both server and client in dev mode
bun run dev
```

The server starts at **http://localhost:3000** and the client at **http://localhost:5173**.

API docs are available at **http://localhost:3000/reference**.

## API Keys

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `OPENROUTER_API_KEY` | Yes | https://openrouter.ai/keys |
| `TMDB_API_KEY` | No | https://www.themoviedb.org/settings/api — needed for the movie/knowledge agent |
| `API_KEY` | No | Shared secret the client sends via `X-API-Key` header (defaults to `demo`) |

## Project Structure

```
ai-agent-demo/
├── packages/
│   ├── server/          # Hono API server
│   │   ├── src/
│   │   │   ├── agents/  # Agent implementations
│   │   │   ├── tools/   # Tool definitions (weather, HN, movies, …)
│   │   │   ├── routes/  # OpenAPI route modules
│   │   │   ├── lib/     # Helpers (streaming, AI client, storage)
│   │   │   └── index.ts # Entry point
│   │   └── data/        # File-based JSON storage (gitignored)
│   └── client/          # SolidJS presentation UI
├── Dockerfile
├── docker-compose.yml
└── package.json         # Bun workspace root
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start server + client in dev mode |
| `bun run dev:server` | Start only the server |
| `bun run dev:client` | Start only the client |
| `bun run build` | Build all packages |
| `bun run start` | Start all packages in production mode |

## Server API

All `/api/*` routes require the `X-API-Key` header.

### Generation

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate` | Generate text (JSON response) |
| POST | `/api/generate/stream` | Generate text (SSE stream) |

### Tools (direct invocation)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tools/weather` | Get weather for a location |
| POST | `/api/tools/hackernews` | Get top Hacker News stories |
| GET | `/api/tools/hackernews/:storyId` | Get HN story details |
| POST | `/api/tools/movies/search` | Search movies (TMDB) |
| GET | `/api/tools/movies/:movieId` | Get movie details |

### Agents (AI-powered)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agents/weather` | Weather specialist agent |
| POST | `/api/agents/hackernews` | Hacker News analyst agent |
| POST | `/api/agents/knowledge` | Movie recommender agent |
| POST | `/api/agents/supervisor` | Multi-agent routing supervisor |
| POST | `/api/agents/memory` | Agent with persistent memory |
| POST | `/api/agents/human-in-loop` | Human-in-the-loop (JSON) |
| POST | `/api/agents/human-in-loop/stream` | Human-in-the-loop (SSE) |
| POST | `/api/agents/human-in-loop/approve` | Approve/reject pending action |
| POST | `/api/agents/recipe` | Structured output (recipe JSON) |
| POST | `/api/agents/guardrails` | Guardrails finance advisor (JSON) |
| POST | `/api/agents/guardrails/stream` | Guardrails finance advisor (SSE) |
| POST | `/api/agents/task` | Parallel task delegation agent |
| POST | `/api/agents/compact` | Conversation compaction agent |
| POST | `/api/agents/coding` | Code generation & execution agent |

### Memory (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memory` | List all memories |
| GET | `/api/memory/:id` | Get a memory by key |
| DELETE | `/api/memory/:id` | Delete a memory |
| DELETE | `/api/memory` | Clear all memories |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| WS | `/api/ws` | WebSocket endpoint |

## TTS Playback

The slide client has a text-to-speech play button on the terminal, but it is **disabled by default** to avoid accidental OpenAI TTS charges. To enable it, open the browser console and run:

```js
localStorage.setItem("tts-enabled", "1")
```

Refresh the page — a play/stop button will appear in the terminal title bar whenever there is a response to read aloud.

To disable it again:

```js
localStorage.removeItem("tts-enabled")
```

## Docker

```bash
# Build and start with Docker Compose
docker compose up --build

# Or build the image directly
docker build -t ai-agent-demo .
docker run -p 3000:3000 --env-file packages/server/.env ai-agent-demo
```

The Docker image builds the client, bundles it with the server, and serves everything from port 3000. A named volume (`app-data`) persists the file-based storage across restarts.
