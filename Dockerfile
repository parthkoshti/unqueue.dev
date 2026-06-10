# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate
WORKDIR /app

# --- Platform pipeline ---

FROM base AS prune-platform
COPY . .
RUN pnpm dlx turbo@2.9.15 prune @unqueue/platform --docker

FROM base AS deps-platform
COPY --from=prune-platform /app/out/json/ .
# Turbo prune strips injectWorkspacePackages from out/pnpm-lock.yaml, but
# pnpm-workspace.yaml still has it — use the root lockfile to avoid a mismatch.
COPY --from=prune-platform /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm install --frozen-lockfile

FROM base AS builder-platform
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY --from=prune-platform /app/out/full/ .
COPY --from=deps-platform /app/ .
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo/cache \
  pnpm turbo run build --filter=@unqueue/platform

FROM nginx:alpine AS platform
COPY apps/platform/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder-platform /app/apps/platform/dist /usr/share/nginx/html
EXPOSE 80

# --- Server pipeline ---

FROM base AS prune-server
COPY . .
RUN pnpm dlx turbo@2.9.15 prune @unqueue/server --docker

FROM base AS deps-server
COPY --from=prune-server /app/out/json/ .
COPY --from=prune-server /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm install --frozen-lockfile

FROM base AS builder-server
COPY --from=prune-server /app/out/full/ .
COPY --from=deps-server /app/ .
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo/cache \
  pnpm turbo run build --filter=@unqueue/server

FROM base AS server-deploy
COPY --from=builder-server /app ./
RUN pnpm --filter @unqueue/server deploy --prod /deploy

FROM base AS server
ENV NODE_ENV=production
WORKDIR /deploy
COPY --from=server-deploy /deploy ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
