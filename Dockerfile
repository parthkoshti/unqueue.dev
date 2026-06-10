# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
WORKDIR /app

# Prune the monorepo to the platform + server dependency graph.
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @unqueue/platform @unqueue/server --docker

# Install dependencies once for the pruned workspace.
FROM base AS deps
COPY --from=prune /app/out/json/ .
# Turbo prune strips injectWorkspacePackages from out/pnpm-lock.yaml, but
# pnpm-workspace.yaml still has it — use the root lockfile to avoid a mismatch.
COPY --from=prune /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm install --frozen-lockfile

# Build both apps in a single turbo invocation.
FROM base AS builder
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY --from=prune /app/out/full/ .
COPY --from=deps /app/ .
RUN pnpm turbo run build --filter=@unqueue/platform --filter=@unqueue/server

# Production bundle for the API (prod deps + built workspace packages only).
FROM base AS server-deploy
COPY --from=builder /app ./
RUN pnpm --filter @unqueue/server deploy --prod /deploy

FROM nginx:alpine AS platform
COPY apps/platform/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/platform/dist /usr/share/nginx/html
EXPOSE 80

FROM base AS server
ENV NODE_ENV=production
WORKDIR /deploy
COPY --from=server-deploy /deploy ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
