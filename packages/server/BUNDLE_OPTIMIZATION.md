# Server Bundle Optimization Opportunities

Current bundle size: **1.5 MB** (`packages/server/dist/index.js`)

## High Impact (200-400kb savings each)

### 1. **Lazy-load Agents**
- **Current**: All 10 agents bundled and imported at startup in `registry/init.ts`
- **Opportunity**: Use dynamic imports for agents, load only when requested
- **Impact**: ~250-350kb (agents + their dependencies loaded only on demand)
- **Effort**: Medium
- **Implementation**: Modify agent registry to support lazy loading, change import() to be on-demand
- **Trade-off**: Slight latency on first agent request (milliseconds)

### 2. **Externalize @scalar/hono-api-reference**
- **Current**: Full API docs UI bundled (~500kb of UI assets, HTML, CSS)
- **Opportunity**: Serve from CDN or lazy-load only in development
- **Impact**: ~200-300kb
- **Effort**: Low
- **Implementation**: Move @scalar to devDependencies, load conditionally in dev only
- **Trade-off**: Need CDN or alternative for production API docs

### 3. **Tree-shake Unused AI SDK Code**
- **Current**: Entire Vercel AI SDK bundled (~400kb+), likely using only subset of functions
- **Opportunity**: Only bundle used exports (e.g., `streamText`, `generateText`, `tool`)
- **Impact**: ~100-150kb
- **Effort**: Medium (requires bundler config changes)
- **Implementation**: Configure Bun bundler with specific entry points, externalize unused AI SDK functions
- **Trade-off**: Need to be explicit about what AI SDK features are used

## Medium Impact (50-150kb savings each)

### 4. **Remove Unused Agent Instances**
- **Current**: 10 agents registered (weather, hackernews, knowledge, supervisor, memory, coding, compact, human-in-loop, recipe, guardrails)
- **Opportunity**: If some agents aren't used in production, exclude them from build
- **Impact**: ~50-100kb per unused agent
- **Effort**: Low
- **Implementation**: Conditionally import agents based on environment or feature flags
- **Trade-off**: Need to know which agents are actually used

### 5. **Minify + Compress Build Output**
- **Current**: Bun bundles without explicit minification flags
- **Opportunity**: Enable aggressive minification in Bun build config
- **Impact**: ~20-30% overall (300-400kb)
- **Effort**: Low
- **Implementation**: Update `package.json` build script with Bun minification flags
- **Trade-off**: Slightly slower builds, harder to debug (use source maps if needed)

### 6. **Code-split Routes**
- **Current**: All routes loaded at startup
- **Opportunity**: Load routes dynamically based on incoming requests
- **Impact**: ~50-100kb
- **Effort**: Medium
- **Implementation**: Use dynamic imports for route handlers, mount routes conditionally
- **Trade-off**: Slightly more complex routing logic

## Low Impact (10-50kb savings each)

### 7. **Audit Tool Dependencies**
- **Current**: Each tool (weather, hackernews, movies) may have their own dependencies
- **Opportunity**: Consolidate or remove unused tools
- **Impact**: ~10-30kb per tool
- **Effort**: Low
- **Implementation**: Check imports in `src/tools/`, remove unused tool dependencies

### 8. **Remove Unused hono Middleware**
- **Current**: May be importing unused hono middleware
- **Opportunity**: Only import middleware actually used
- **Impact**: ~10-20kb
- **Effort**: Low
- **Implementation**: Audit `middleware/` directory, remove unused middleware

### 9. **Optimize Zod Schema Definitions**
- **Current**: All Zod schemas compiled into OpenAPI definitions
- **Opportunity**: If routes have very large/complex schemas, simplify or lazy-define them
- **Impact**: ~10-50kb
- **Effort**: Low
- **Implementation**: Review schema definitions, consider removing unused validation rules

## Recommended Quick Wins (Start Here)

1. **Minify the build** (5-10 min setup, 20-30% savings)
   ```bash
   # Update packages/server/package.json build script
   "build": "bun build src/index.ts --outdir dist --target bun --minify"
   ```

2. **Exclude unused agents** (5 min, ~50-100kb)
   - Review which agents are actually used
   - Conditionally import in `registry/init.ts` based on feature flags

3. **Lazy-load agents** (1-2 hours, ~250kb)
   - Convert static imports to dynamic imports
   - Modify agent registry to cache loaded agents

4. **Externalize @scalar** (15 min, ~200kb)
   - Move to devDependencies
   - Load only when `NODE_ENV !== 'production'`

## Measurement

Track bundle size changes:
```bash
# Before optimization
du -h packages/server/dist/index.js

# After each optimization
du -h packages/server/dist/index.js
```

## Notes

- Current build uses Bun's native bundler (not webpack/rollup)
- No source maps are generated (adds 10-20% size)
- All dependencies are bundled (no externals configured)
- Production build conditionally includes client dist (check NODE_ENV flag)
