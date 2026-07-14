# AI Compliance Gateway (ACG)

A production-grade API gateway for AI workloads with compliance, governance, risk, and evaluation engines.

## Monorepo Structure

- `apps/admin` — Admin & audit API (Fastify)
- `apps/gateway` — Core proxy for prompt/moderation routes
- `apps/evaluator` — Evaluation & workflow execution service
- `apps/dashboard` — Next.js UI for admin engines
- `apps/playground` — Next.js chat playground
- `packages/*` — Shared engines, connectors, contracts, SDK, DB
- `configs/` — Service configs (Keycloak, Kong, OPA, etc.)
- `deployments/docker/` — Docker images
- `docs/adrs/` — Architecture decision records

## Stack

- TypeScript, Node.js, pnpm workspaces, Turbo
- Next.js 15, Fastify, Prisma, PostgreSQL
- Open Policy Agent (OPA), Kong, Keycloak, OpenTelemetry

## Quick start

```bash
pnpm install
pnpm build
pnpm dev
```

See `Makefile` and `docker-compose.yml` for service profiles.

## Documentation

Architecture decisions live in `docs/adrs/`.
