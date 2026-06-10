FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm install
RUN pnpm --filter @unstall/platform build

FROM nginx:alpine AS runner
COPY --from=build /app/apps/platform/dist /usr/share/nginx/html
COPY apps/platform/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
