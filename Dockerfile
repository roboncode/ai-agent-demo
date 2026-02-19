# Stage 1: Install all dependencies
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

RUN bun install --frozen-lockfile

# Stage 2: Build the client
FROM deps AS build-client
WORKDIR /app

COPY packages/client packages/client
RUN bun run --filter 'client' build

# Stage 3: Production image
FROM oven/bun:1-slim AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace root + server package.json for install
COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

RUN bun install --frozen-lockfile --production

# Copy server source (run from source — bun handles TS natively)
COPY packages/server/src packages/server/src
COPY packages/server/tsconfig.json packages/server/tsconfig.json

# Copy built client assets
COPY --from=build-client /app/packages/client/dist packages/client/dist

# Ensure data directory exists
RUN mkdir -p packages/server/data

EXPOSE 3000

CMD ["bun", "run", "packages/server/src/index.ts"]
