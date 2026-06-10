# Unstall

Realtime operational dashboard for BullMQ. AGPL-3.0 licensed.

## Features

- Queue observability with auto-discovery
- Live job inspection, structured logs, and progress
- Socket.IO realtime updates
- In-memory rolling-window metrics
- Job and queue admin actions
- Workspace RBAC with email/password auth
- Bookmarks and Discord alerts

## Requirements

- Node.js 24+
- pnpm 10+
- [Doppler CLI](https://docs.doppler.com/docs/install-cli)
- PostgreSQL 18+ (`DATABASE_URL`)
- Redis (`REDIS_URL`, optional; separate from your BullMQ Redis instances)

## Secrets (Doppler)

This repo uses Doppler for all secrets. There is no local `.env` workflow.

1. Install the Doppler CLI and log in:

```bash
brew install dopplerhq/cli/doppler   # macOS
doppler login
```

2. Link the repo (creates project `unstall` / config `dev` if needed):

```bash
pnpm doppler:setup
```

3. Add secrets using `.env.example` as a key reference:

```bash
pnpm doppler:secrets
```

Generate an encryption key:

```bash
node -e "console.log(JSON.stringify([{keyId:1,key:require('crypto').randomBytes(32).toString('base64')}]))"
```

Set it in Doppler:

```bash
doppler secrets set ENCRYPTION_KEYS='[{"keyId":1,"key":"..."}]'
doppler secrets set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
```

For local dev, `VITE_API_URL` can be left empty so the platform uses the Vite proxy to the API.

## Quick start (development)

1. Set `DATABASE_URL` and `REDIS_URL` in Doppler (see `.env.example`).

2. Install dependencies and migrate:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

3. Start dev servers:

```bash
pnpm dev
```

- Platform: http://localhost:5173
- API: http://localhost:3001

4. (Optional) Run the demo BullMQ worker:

```bash
pnpm demo-worker
```

Then add your BullMQ Redis instance in Settings.

## Docker / Dokploy

Two compose files:

| File | Services |
|------|----------|
| `docker-compose.infra.yml` | Postgres, PgBouncer, Redis |
| `docker-compose.yml` | Server, Platform |

Deploy infra and app as separate Dokploy compose stacks (or environments). Point `DATABASE_URL` at PgBouncer (`pgbouncer:5432` in-network, port `6432` externally) and `REDIS_URL` at `redis:6379`.

**Infra stack:** set env vars from `.env.infra.example` in Dokploy compose environment.

**App stack:** secrets in Doppler; run with `doppler run -- docker compose up` (see `pnpm compose:up`). Connection URLs (`DATABASE_URL`, `REDIS_URL`): `.env.example`.

App stack (local):

```bash
pnpm compose:up:build
```

## Architecture

- `apps/platform` - React SPA (Vite, TanStack Router/Query/Table/Virtual)
- `apps/server` - Hono API, oRPC, Socket.IO, BullMQ integration
- `packages/*` - Shared libraries

## Testing

```bash
pnpm test
```

Unit tests do not require Doppler. Commands that touch the database (`db:migrate`, `dev`, `build`) run through `doppler run`.

## License

AGPL-3.0 - see [LICENSE](LICENSE). Hosted official instance: https://app.unstall.dev
