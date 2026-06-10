FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/server/package.json ./apps/server/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install
RUN pnpm --filter @unstall/server... build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
