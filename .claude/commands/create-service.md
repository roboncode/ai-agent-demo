# Create New Service

Create a new microservice in the `packages/service/` directory following the established patterns and tech stack.

## Service Architecture Overview

Services in this monorepo are independent microservices that:
- Run as standalone HTTP APIs
- Use **Hono** framework for routing
- Support dual deployment: **Node.js** AND **Cloudflare Workers**
- Follow **OpenAPI 3.1** specification with **Scalar** documentation UI
- Use **Zod 4** for request/response validation
- Are written in **TypeScript** with ESM modules
- Can be consumed as SDK or HTTP API

## Tech Stack

### Core Dependencies
- **Hono** (^4.6.14) - Fast web framework
- **@hono/zod-openapi** (^1.1.4) - OpenAPI integration
- **@scalar/hono-api-reference** (^0.9.23) - API documentation UI
- **Zod** (^4.1.12) - Schema validation
- **@t3-oss/env-core** (^0.13.8) - **Required** - Type-safe environment validation
- **dotenv** (^16.4.7) - **Required** - Load .env files (dev dependency)

### Development Dependencies
- **TypeScript** (^5.7.2)
- **tsx** (^4.20.6) - TypeScript execution
- **Wrangler** (^4.45.4) - Cloudflare Workers deployment
- **Vitest** (^2.1.8) - Testing
- **@cloudflare/workers-types** (^4.20251014.0) - Workers types

## Directory Structure

```
packages/service/[service-name]/
├── src/
│   ├── index.ts           # Node.js entry point
│   ├── worker.ts          # Cloudflare Workers entry point
│   ├── app.ts             # Hono app factory (core logic)
│   ├── schemas.ts         # Zod schemas for OpenAPI
│   ├── types.ts           # TypeScript types
│   ├── env.ts             # Environment config with t3-env
│   ├── utils.ts           # Utility functions
│   └── [Service]Service.ts # Main service class/SDK
├── tests/
│   ├── test-all.sh        # Run all tests
│   ├── 01-*.sh            # Individual test suites
│   └── ...
├── scripts/
│   └── setup-secrets.sh   # Cloudflare secrets setup
├── .env                   # Local development env
├── .env.example           # Example env file
├── .dev.vars              # Cloudflare Workers local env
├── package.json           # Package config
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config for tests
├── wrangler.toml          # Cloudflare Workers config
└── README.md              # Documentation
```

## Step-by-Step Guide

### 1. Create Directory Structure

```bash
cd packages/server
mkdir -p [service-name]/{src,tests,scripts}
cd [service-name]
```

### 2. Create package.json

```json
{
  "name": "@server/[service-name]",
  "version": "1.0.0",
  "description": "[Service description]",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "start": "NODE_ENV=production tsx src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "test:run": "vitest run",
    "workers:dev": "wrangler dev",
    "workers:deploy": "wrangler deploy",
    "workers:deploy:prod": "wrangler deploy --env production",
    "workers:tail": "wrangler tail",
    "workers:secrets": "bash scripts/setup-secrets.sh",
    "workers:secret:put": "wrangler secret put"
  },
  "keywords": ["[service-name]", "hono", "api"],
  "license": "MIT",
  "dependencies": {
    "@hono/zod-openapi": "^1.1.4",
    "@scalar/hono-api-reference": "^0.9.23",
    "@t3-oss/env-core": "^0.13.8",
    "dotenv": "^16.4.7",
    "hono": "^4.6.14",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20251014.0",
    "@types/node": "^22.10.2",
    "tsx": "^4.20.6",
    "typescript": "^5.7.2",
    "vite": "^5.4.11",
    "vitest": "^2.1.8",
    "wrangler": "^4.45.4"
  }
}
```

### 3. Create TypeScript Config (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create Environment Config (src/env.ts)

**IMPORTANT**: Always use `@t3-oss/env-core` for environment validation. This provides:
- ✅ Type-safe environment variables
- ✅ Runtime validation on startup (fail fast on misconfiguration)
- ✅ Clear error messages for missing/invalid variables
- ✅ Default values and transformations
- ✅ Auto-completion in your IDE

**Simple env.ts example:**

```typescript
import { config } from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Load .env file before validation
config();

export const env = createEnv({
  server: {
    PORT: z.string().default("5000"),
    NODE_ENV: z.enum(["development", "production"]).default("development"),

    // Required variables (will throw if missing)
    API_KEY: z.string().min(1),
    API_SECRET: z.string().min(32),

    // Optional variables
    WEBHOOK_URL: z.string().url().optional(),

    // Variables with transformation
    MAX_CONNECTIONS: z.coerce.number().default(100),
    ENABLE_FEATURE: z.string().transform(val => val === "true").default("false"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true, // Treat empty strings as undefined
});

// Export type for use elsewhere
export type Env = typeof env;
```

**Complex env.ts example with path resolution:**

```typescript
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Get directory for loading .env from package root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from package root
config({ path: join(__dirname, "..", ".env") });

export const env = createEnv({
  server: {
    // Server Configuration
    PORT: z.string().default("5000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Service URLs
    UPSTREAM_SERVICE_URL: z.string().url().default("http://localhost:8080"),

    // Database
    DATABASE_URL: z.string().url(),

    // Credentials (required in production, optional in dev)
    API_KEY: z.string().min(1),
    API_SECRET: z.string().min(32),

    // Feature Flags
    ENABLE_CACHING: z.string().default("true"),
    ENABLE_WEBHOOKS: z.string().default("false"),

    // Numeric Configurations with coercion
    MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB
    TIMEOUT_MS: z.coerce.number().default(30000),
    RATE_LIMIT: z.coerce.number().default(100),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export type Env = typeof env;
```

**Key Features:**

1. **Automatic Validation**: App won't start with invalid config
2. **Type Safety**: Full TypeScript types inferred from schema
3. **Clear Errors**: Shows exactly what's missing/wrong
4. **Defaults**: Set sensible defaults for optional values
5. **Coercion**: Transform strings to numbers, booleans, etc.
6. **Documentation**: Schema serves as self-documenting config

**Common Patterns:**

```typescript
// URL validation
BASE_URL: z.string().url()

// Enum validation
ENVIRONMENT: z.enum(["dev", "staging", "prod"])

// Number coercion from string
PORT: z.coerce.number()
MAX_SIZE: z.coerce.number().default(100)

// Boolean coercion from string
ENABLED: z.string().transform(val => val === "true")

// Optional with default
TIMEOUT: z.string().default("5000")

// Required with validation
API_KEY: z.string().min(32, "API key must be at least 32 characters")

// Complex validation
EMAIL: z.string().email()
URL_WITH_HTTPS: z.string().url().refine(url => url.startsWith("https://"))
```

### 5. Create Schemas (src/schemas.ts)

```typescript
import { z } from "@hono/zod-openapi";

// Health check schema
export const HealthCheckResponseSchema = z.object({
  status: z.string().openapi({ example: "ok" }),
  timestamp: z.string().openapi({ example: "2025-01-07T12:00:00.000Z" }),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string().openapi({ example: "An error occurred" }),
  details: z.string().optional().openapi({ example: "Detailed error information" }),
});

// Add your service-specific schemas here
```

### 6. Create App Factory (src/app.ts)

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { HealthCheckResponseSchema, ErrorResponseSchema } from "./schemas";

export interface AppEnv {
  PORT: string;
  NODE_ENV: string;
  // Add your service-specific env vars
}

export function createApp(env: AppEnv) {
  const app = new OpenAPIHono();

  // ===================================================================
  // MIDDLEWARE
  // ===================================================================

  // Request logging
  app.use("*", async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    await next();
    const duration = Date.now() - start;
    const status = c.res.status;
    const emoji = status >= 200 && status < 300 ? "✓" : status >= 400 ? "✗" : "○";
    console.log(`${emoji} ${method} ${path} - ${status} (${duration}ms)`);
  });

  // CORS
  app.use("*", async (c, next) => {
    await next();
    c.res.headers.set("Access-Control-Allow-Origin", "*");
    c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    c.res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  });

  // ===================================================================
  // ROUTES
  // ===================================================================

  // Health check
  const healthRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["Health"],
    summary: "Health check",
    description: "Check if the service is running",
    responses: {
      200: {
        description: "Service is healthy",
        content: {
          "application/json": { schema: HealthCheckResponseSchema },
        },
      },
    },
  });

  app.openapi(healthRoute, (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Add your service routes here

  // ===================================================================
  // API DOCUMENTATION
  // ===================================================================

  app.get("/openapi", (c) => {
    return c.json(
      app.getOpenAPIDocument({
        openapi: "3.1.0",
        info: {
          version: "1.0.0",
          title: "[Service Name] API",
          description: "[Service description]",
        },
        servers: [
          { url: `http://localhost:${env.PORT}`, description: "Development" },
        ],
      })
    );
  });

  app.get(
    "/docs",
    Scalar({
      theme: "purple",
      pageTitle: "[Service Name] API",
      url: "/openapi",
    }) as any
  );

  // ===================================================================
  // ERROR HANDLERS
  // ===================================================================

  app.notFound((c) => c.json({ error: "Not Found" }, 404));

  app.onError((err, c) => {
    console.error("API Error:", err);
    return c.json(
      {
        error: err.message || "Internal Server Error",
        ...(env.NODE_ENV === "development" && { stack: err.stack }),
      },
      500
    );
  });

  return app;
}
```

### 7. Create Node.js Entry Point (src/index.ts)

```typescript
import { serve } from "@hono/node-server";
import { env } from "./env";
import { createApp } from "./app";

const app = createApp(env);

const port = parseInt(env.PORT, 10);

serve({ fetch: app.fetch, port }, () => {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  [Service Name] v1.0.0");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Server:      http://localhost:${port}`);
  console.log(`  Docs:        http://localhost:${port}/docs`);
  console.log(`  OpenAPI:     http://localhost:${port}/openapi`);
  console.log(`  Health:      http://localhost:${port}/`);
  console.log("═══════════════════════════════════════════════════════════");
});
```

### 8. Create Cloudflare Workers Entry Point (src/worker.ts)

```typescript
import { createApp } from "./app";

export interface Env {
  // Define Workers environment bindings here
  // e.g., KV namespaces, Durable Objects, secrets
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const app = createApp({
      PORT: "8787",
      NODE_ENV: "production",
      // Map Workers env to AppEnv
    });

    return app.fetch(request);
  },
};
```

### 9. Create Wrangler Config (wrangler.toml)

```toml
name = "[service-name]"
main = "src/worker.ts"
compatibility_date = "2024-11-01"

# Development
[env.development]
name = "[service-name]-dev"

# Production
[env.production]
name = "[service-name]"
```

### 10. Create Environment Files

**.env.example:**
```env
PORT=5000
NODE_ENV=development
# Add your service-specific variables
```

**.env:**
```env
# Copy from .env.example and fill with actual values
```

**.dev.vars:**
```env
# Copy from .env for local Cloudflare Workers development
```

### 11. Create Setup Script (scripts/setup-secrets.sh)

```bash
#!/bin/bash
set -e

echo "📦 Setting up Cloudflare Workers secrets..."

if [ ! -f .dev.vars ]; then
  echo "❌ Error: .dev.vars file not found"
  exit 1
fi

while IFS='=' read -r key value; do
  if [[ ! $key =~ ^# ]] && [[ -n $key ]]; then
    echo "Setting secret: $key"
    echo "$value" | wrangler secret put "$key"
  fi
done < .dev.vars

echo "✅ All secrets uploaded successfully!"
```

### 12. Create Test Suite (tests/test-all.sh)

```bash
#!/bin/bash
set -e

echo "🧪 Running [Service Name] Test Suite"
echo "======================================"

# Health check
echo ""
echo "1️⃣  Health Check"
./01-health-check.sh

# Add more test scripts
echo ""
echo "✅ All tests passed!"
```

### 13. Create README.md

See the storage service README as a template. Include:
- Description and features
- Prerequisites
- Quick start guide
- API documentation reference
- Environment variables table
- Deployment instructions (Node.js and Workers)
- SDK usage examples
- Testing instructions
- Troubleshooting section

## Environment Validation with t3-env (CRITICAL)

### Why env.ts is Required

**DO NOT skip this step!** Environment validation is critical for:

1. **Fail Fast**: Catch configuration errors at startup, not in production
2. **Type Safety**: Get autocomplete and type checking for env vars
3. **Self-Documentation**: Schema documents all required configuration
4. **Clear Errors**: Know exactly what's missing or wrong
5. **No Runtime Surprises**: Prevent `undefined` errors at runtime

### Common Mistakes to Avoid

❌ **WRONG - Direct process.env access:**
```typescript
const port = process.env.PORT; // string | undefined - no validation!
const apiKey = process.env.API_KEY; // might be undefined, will crash later
```

✅ **CORRECT - Use env.ts:**
```typescript
import { env } from "./env";
const port = env.PORT; // string - guaranteed to exist
const apiKey = env.API_KEY; // string - validated on startup
```

❌ **WRONG - Manual parsing:**
```typescript
const maxSize = parseInt(process.env.MAX_SIZE || "100");
// Fails silently if MAX_SIZE is "abc"
```

✅ **CORRECT - Use z.coerce:**
```typescript
// In env.ts
MAX_SIZE: z.coerce.number().default(100)
// Throws clear error if not a valid number
```

❌ **WRONG - No validation:**
```typescript
const url = process.env.API_URL;
// Might be malformed, will fail later
```

✅ **CORRECT - Validate format:**
```typescript
// In env.ts
API_URL: z.string().url()
// Validates it's a proper URL at startup
```

### Real-World Example

**Bad approach (don't do this):**
```typescript
// app.ts
const config = {
  port: process.env.PORT || 3000, // Type is string | number
  apiKey: process.env.API_KEY, // Might be undefined
  maxSize: parseInt(process.env.MAX_SIZE), // NaN if invalid
  enableFeature: process.env.ENABLE_FEATURE === "true", // string | boolean
};

// Later in code - runtime error!
const api = new Service(config.apiKey); // Error: apiKey is undefined
```

**Good approach (always do this):**
```typescript
// env.ts
export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(3000),
    API_KEY: z.string().min(1, "API_KEY is required"),
    MAX_SIZE: z.coerce.number().positive(),
    ENABLE_FEATURE: z.string().transform(val => val === "true").default("false"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

// app.ts
import { env } from "./env";
// App won't start if config is invalid!
// All values are properly typed and validated
const api = new Service(env.API_KEY); // Always a valid string
```

### Type Export Pattern

Always export the type for reuse:

```typescript
// env.ts
export const env = createEnv({...});
export type Env = typeof env;

// app.ts
import type { Env } from "./env";

export interface AppEnv extends Env {
  // Can extend with computed values if needed
}
```

## Best Practices

### Route Organization
- Group related routes together
- Use consistent naming conventions
- Always use `createRoute()` for OpenAPI docs
- Tag routes for documentation organization

### Error Handling
- Return appropriate HTTP status codes
- Use Zod for request validation
- Include helpful error messages
- Log errors for debugging

### Environment Variables
- **ALWAYS** use `@t3-oss/env-core` with `createEnv()` - never use `process.env` directly
- Load `.env` file with `dotenv` before calling `createEnv()`
- Validate all required variables - fail fast on startup
- Provide sensible defaults where appropriate
- Use `z.coerce.number()` for numeric values from strings
- Use `.optional()` for truly optional variables
- Document all variables in README with types and defaults
- Never commit sensitive values
- Export `Env` type for use in other modules
- Use descriptive error messages: `z.string().min(32, "API key must be at least 32 characters")`

### Testing
- Write shell script tests for HTTP endpoints
- Test all happy paths and error cases
- Include examples in test scripts
- Document expected responses

### Documentation
- Keep README up to date
- Let OpenAPI/Scalar be the source of truth for API docs
- Include code examples
- Document deployment steps

## Integration with Main API

If your service needs to be called from the main API (`packages/api`):

1. **Add as workspace dependency in API package.json:**
```json
{
  "dependencies": {
    "@service/[service-name]": "workspace:*"
  }
}
```

2. **Import and use in API routes:**
```typescript
import { ServiceClass } from "@service/[service-name]";

// Use as SDK
const service = new ServiceClass({ /* config */ });
const result = await service.someMethod();

// Or call HTTP API
const response = await fetch("http://localhost:5000/endpoint");
```

## Deployment Options

### Node.js (VPS/Container)
```bash
pnpm build
NODE_ENV=production pnpm start
```

### Cloudflare Workers (Serverless)
```bash
# Upload secrets
pnpm workers:secrets

# Deploy to production
pnpm workers:deploy:prod

# Monitor logs
pnpm workers:tail
```

## Example: Storage Service

See `packages/service/storage/` for a complete reference implementation that:
- Handles file uploads and storage
- Supports dual deployment (Node.js + Workers)
- Uses OpenAPI + Scalar documentation
- Includes comprehensive test suite
- Provides TypeScript SDK
- Has detailed README

## Questions to Consider

Before creating a new service, ask:
1. Should this be a separate service or part of the main API?
2. Does it need to run on Cloudflare Workers or just Node.js?
3. What external dependencies does it require?
4. Will it be consumed as SDK, HTTP API, or both?
5. What environment variables does it need?
6. What are the authentication requirements?

## Common Gotchas

- **Missing env.ts**: NEVER use `process.env` directly - always create `env.ts` with t3-env validation
- **Forgotten dotenv**: Must call `config()` before `createEnv()` or .env won't load
- **Type coercion**: Use `z.coerce.number()` for numbers, not `parseInt()`
- **Workers compatibility**: Not all Node.js APIs work in Workers (fs, crypto, etc.)
- **OpenAPI schemas**: Must use `@hono/zod-openapi` import for Zod, not plain `zod`
- **ESM modules**: Use `type: "module"` in package.json
- **Port conflicts**: Check that PORT doesn't conflict with other services
- **Environment validation**: Validate on startup - fail fast, don't discover missing config in production
