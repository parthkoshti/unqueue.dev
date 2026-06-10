FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/platform/package.json ./apps/platform/
COPY apps/server/package.json ./apps/server/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm turbo run build --filter=@unqueue/platform

FROM nginx:alpine AS runner
COPY --from=build /app/apps/platform/dist /usr/share/nginx/html
COPY apps/platform/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
