# ACG Architecture

This document describes the high-level architecture of AI Compliance Gateway (ACG), a Cloudflare-like platform for AI governance and compliance.

## Design Philosophy

ACG is built on three principles:

1. **Orchestrate, don't reimplement** — ACG orchestrates upstream open-source services (OPA, NeMo Guardrails, Keycloak) via HTTP/gRPC. It never reimplements their logic.
2. **Fail closed** — When upstream services are unreachable, ACG denies requests. A silent failure in compliance enforcement is a security incident.
3. **Evidence chain** — Every policy decision produces a cryptographically chained audit entry. Compliance is not a checkbox; it's a verifiable proof chain.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Dashboard │  │   CLI    │  │ VS Code  │  │ GitHub Action│   │
│  │ (Next.js) │  │ (Node)   │  │ Extension│  │ (Composite)  │   │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        │              │              │               │           │
│        └──────────────┼──────────────┼───────────────┘           │
│                       │              │                           │
│                       ▼              ▼                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   API Layer (REST)                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │    │
│  │  │ Gateway  │  │  Admin   │  │ MCP Server           │  │    │
│  │  │ :3000    │  │  :3002   │  │ (Stdio)              │  │    │
│  │  └────┬─────┘  └────┬─────┘  └──────────────────────┘  │    │
│  └───────┼──────────────┼─────────────────────────────────┘    │
│          │              │                                       │
│          ▼              ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Kernel Layer                          │    │
│  │                                                         │    │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐  │    │
│  │  │  Plugin    │  │  Rule    │  │  Registry          │  │    │
│  │  │  Runtime   │  │  Engine  │  │  (26 packages)     │  │    │
│  │  │            │  │          │  │                    │  │    │
│  │  │ Lifecycle  │  │ OPA      │  │ Plugin discovery   │  │    │
│  │  │ hooks      │  │ JavaScript│ │ Pack management    │  │    │
│  │  │ Sandboxing │  │ Python   │  │ Version resolution │  │    │
│  │  └────────────┘  └──────────┘  └────────────────────┘  │    │
│  │                                                         │    │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐  │    │
│  │  │  Asset     │  │ Evidence │  │  Compliance        │  │    │
│  │  │  Graph     │  │  Engine  │  │  Score Engine      │  │    │
│  │  │  Engine    │  │          │  │                    │  │    │
│  │  │            │  │ Chain    │  │ Per-org scoring    │  │    │
│  │  │ AI-BOM     │  │ integrity│  │ History tracking   │  │    │
│  │  │ Discovery  │  │ Export   │  │ Gap analysis       │  │    │
│  │  └────────────┘  └──────────┘  └────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│          │              │                                       │
│          ▼              ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Engine Layer                            │    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │    │
│  │  │ AI       │  │ Risk     │  │Governance│  │Compli- │  │    │
│  │  │ Router   │  │ Engine   │  │ Engine   │  │ance    │  │    │
│  │  │          │  │          │  │          │  │Engine  │  │    │
│  │  │ Smart    │  │ ML-ready │  │ Org      │  │Rule    │  │    │
│  │  │ routing  │  │ signals  │  │ policies │  │eval    │  │    │
│  │  │ Fallback │  │ Severity │  │ RBAC     │  │Evidence│  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│          │                                                      │
│          ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │               Infrastructure Layer                       │    │
│  │                                                         │    │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐  │    │
│  │  │ PostgreSQL │  │  Redis   │  │  NATS              │  │    │
│  │  │            │  │          │  │                    │  │    │
│  │  │ Prisma ORM │  │ Caching  │  │ Event bus          │  │    │
│  │  │ 10 models  │  │ Sessions │  │ 50+ event types    │  │    │
│  │  └────────────┘  └──────────┘  └────────────────────┘  │    │
│  │                                                         │    │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────────────┐  │    │
│  │  │ Keycloak   │  │   OPA    │  │ NeMo Guardrails    │  │    │
│  │  │            │  │          │  │                    │  │    │
│  │  │ SSO/SAML   │  │ Rego     │  │ Content safety     │  │    │
│  │  │ OIDC       │  │ policies │  │ Input/output       │  │    │
│  │  │ RBAC       │  │ eval     │  │ guardrails         │  │    │
│  │  └────────────┘  └──────────┘  └────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Gateway (`apps/gateway/`)

The AI Gateway is the primary traffic plane. Every AI request passes through it.

**Middleware Stack:**
1. Rate Limiter — sliding window per API key
2. API Key Auth — PostgreSQL-backed with 1-minute cache
3. Request Logger — structured logging with request ID
4. Event Publisher — NATS event emission
5. Error Handler — centralized error handling
6. Usage Tracker — request/response counting
7. Plan Enforcement — subscription quota checking

**Key Routes:**
- `POST /chat/completions` — OpenAI-compatible chat (with SSE streaming)
- `POST /moderations` — Content moderation
- `GET /kernel/stats` — Kernel statistics
- `POST /kernel/compliance/score` — Compliance scoring
- `POST /kernel/asset-graph/discover` — AI-BOM generation

### Admin API (`apps/admin/`)

The Admin API manages organizations, subscriptions, compliance, and marketplace operations.

**Key Endpoints:**
- `/v1/compliance/scores` — CRUD + history
- `/v1/providers` — AI provider registry
- `/v1/subscriptions` — Plan management
- `/v1/marketplace` — Pack install/publish/search
- `/v1/rbac` — Role assignment + permission checks
- `/v1/audit` — Audit trail query + stats
- `/v1/tools/scan`, `/bom` — Local scanning

### Dashboard (`apps/dashboard/`)

Next.js 15 web application for visualizing compliance, providers, BOM, and settings.

**Key Pages:**
- `/dashboard` — Overview with compliance scores
- `/compliance` — Compliance score history
- `/providers` — AI provider registry
- `/bom` — AI Bill of Materials
- `/settings` — Organization settings

### MCP Server (`packages/mcp-server/`)

Model Context Protocol server providing 7 tools for AI coding assistants (Claude, Cursor, etc.).

**Tools:** `acg_scan`, `acg_score`, `acg_bom`, `acg_compliance_packs`, `acg_chat`, `acg_moderate`, `acg_health`

### CLI (`packages/cli/`)

Command-line interface with 11 commands. Supports both local and remote (API) modes.

**Commands:** `scan`, `score`, `bom`, `explain`, `report`, `packs`, `plugins`, `providers`, `config`, `doctor`, `init`

## Kernel Architecture

The Kernel is ACG's extensible core. It manages plugins, rules, asset graphs, evidence chains, and compliance scores.

### Plugin Runtime

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  type: 'engine' | 'rule-pack' | 'connector' | 'dashboard' | 'middleware';
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}
```

Plugins are loaded, initialized, and managed with lifecycle hooks. Each plugin runs in a sandboxed context with resource limits (CPU, memory, timeout, network).

### Rule Engine

Supports three rule languages:
- **OPA/Rego** — production-grade policy evaluation via OPA sidecar
- **JavaScript** — inline rules for fast iteration
- **Python** — ML-heavy compliance checks

Rules produce `allow`/`deny` decisions with structured metadata for evidence generation.

### Asset Graph Engine

Discovers and tracks AI components across your codebase:
- Models (OpenAI, Anthropic, Azure, etc.)
- Datasets (training data, fine-tuning data)
- Tools (plugins, extensions, APIs)
- Dependencies (npm, pip, go modules)

Produces a dependency graph and generates AI-BOM (AI Bill of Materials).

### Evidence Engine

Every policy decision produces an evidence entry with:
- Request/response payloads
- Policy decisions (allow/deny with rule IDs)
- Timestamps and request IDs
- Cryptographic chaining (each entry references the previous)

Evidence is queryable and exportable for audit purposes.

### Compliance Score Engine

Calculates compliance scores per organization and project:
- Rule pass/fail ratios
- Weighted scoring by severity
- Historical tracking with trends
- Gap analysis with recommendations

## Data Model

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Organization │────▶│    Project   │────▶│     Policy   │
│              │     │              │     │              │
│ plan         │     │ name         │     │ rules[]      │
│ settings     │     │ config       │     │ status       │
│ created_at   │     │ created_at   │     │ framework    │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ├──▶ ┌──────────────┐     ┌──────────────┐
       │    │   ApiKey     │     │ Subscription │
       │    │              │     │              │
       │    │ key_hash     │     │ plan         │
       │    │ project_id   │     │ status       │
       │    │ permissions  │     │ usage        │
       │    └──────────────┘     └──────────────┘
       │
       ├──▶ ┌──────────────┐     ┌──────────────┐
       │    │  AuditLog    │     │ UsageRecord  │
       │    │              │     │              │
       │    │ action       │     │ request_count│
       │    │ resource     │     │ token_count  │
       │    │ user_id      │     │ period       │
       │    └──────────────┘     └──────────────┘
       │
       ├──▶ ┌──────────────┐     ┌──────────────┐
       │    │ Compliance   │     │   AiProvider │
       │    │ ScoreHistory │     │              │
       │    │              │     │ name         │
       │    │ score        │     │ features[]   │
       │    │ framework    │     │ regions[]    │
       │    │ timestamp    │     │ certified    │
       │    └──────────────┘     └──────────────┘
       │
       └──▶ ┌──────────────┐
            │     User     │
            │              │
            │ email        │
            │ role         │
            │ keycloak_id  │
            └──────────────┘
```

**Prisma Schema:** 10 models in `packages/database/prisma/schema.prisma`

## Event System

ACG uses NATS as its event bus with 50+ event types across five domains:

| Domain | Example Events |
|--------|---------------|
| **Request** | `request.received`, `request.routed`, `request.blocked`, `request.completed` |
| **Compliance** | `policy.evaluated`, `compliance.scored`, `evidence.captured` |
| **Provider** | `provider.selected`, `provider.fallback`, `provider.failed` |
| **Asset** | `asset.discovered`, `bom.generated`, `dependency.analyzed` |
| **Governance** | `user.created`, `role.assigned`, `audit.logged` |

Events are consumed by:
- Evidence engine (for audit trail)
- Compliance score engine (for scoring)
- External integrations (webhooks, SIEM)
- Dashboard (real-time updates)

## Security Model

### Authentication Flow

```
Client → Keycloak (JWT) → Gateway → OPA (policy check) → Provider
         │                                           │
         └── RBAC roles ──────────────────────────────┘
```

### API Key Authentication

1. Client sends `X-Api-Key` header
2. Gateway hashes key with SHA-256
3. Looks up hash in PostgreSQL (with 1-min Redis cache)
4. Validates key is active and not expired
5. Attaches organization/project context to request

### Policy Enforcement (Fail-Closed)

1. Request arrives at gateway
2. Gateway sends policy check to OPA
3. If OPA returns `allow` → proceed
4. If OPA returns `deny` → block with 403
5. If OPA is unreachable → **deny** (fail-closed)
6. If NeMo Guardrails is unreachable → **deny** (fail-closed)

### RBAC (5 Roles)

| Role | Permissions |
|------|-------------|
| Owner | Full access + billing + delete org |
| Admin | Manage users, policies, settings |
| Compliance Officer | View/edit compliance, audit trails |
| Developer | Create projects, manage API keys |
| Viewer | Read-only access |

Roles inherit from parent: Owner > Admin > Compliance Officer > Developer > Viewer.

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Gateway | Fastify | Fastest Node.js HTTP framework |
| Admin | Fastify + Prisma | Type-safe ORM, migrations |
| Dashboard | Next.js 15, React 19 | SSR, RSC, modern React |
| CLI | Commander.js | Battle-tested CLI framework |
| MCP | @modelcontextprotocol/sdk | Official MCP SDK |
| Database | PostgreSQL 15 | ACID, JSON support, FTS |
| Cache | Redis 7 | Sub-ms lookups |
| Events | NATS | Lightweight, fast, at-most-once |
| Auth | Keycloak 24 | OIDC, SAML, RBAC |
| Policy | OPA 1.x | Industry-standard policy engine |
| ORM | Prisma 5 | Type-safe, migration system |
| Build | Turborepo | Monorepo task orchestration |
| Test | Vitest | Fast, TypeScript-native |
| Lint | ESLint + Prettier | Code quality |

## Deployment Models

### Self-Hosted (Docker Compose)

```bash
docker compose up -d
```

Services: gateway, admin, dashboard, postgres, redis, nats, keycloak, opa, prometheus, grafana.

### Kubernetes (Helm)

```bash
helm install acg ./infra/helm/acg
```

Production-ready with horizontal scaling, rolling updates, and resource limits.

### Managed Cloud (Coming Soon)

```bash
acg login --cloud
acg scan . --remote
```

Fully managed SaaS with SLA, support, and enterprise features.

## Performance Characteristics

| Metric | Target | Notes |
|--------|--------|-------|
| Latency overhead | < 5ms p99 | Policy evaluation per request |
| Throughput | > 10K req/s | Gateway with rate limiting |
| Evidence chain | < 1ms append | Append-only with cryptographic chaining |
| Compliance score | < 100ms | Per-organization score calculation |
| Plugin load | < 500ms | Cold start for new plugins |

## Design Decisions

Architecture Decision Records (ADRs) are stored in `docs/adr/`. Key decisions:

- **ADR-001**: Use OPA for policy evaluation (not custom engine)
- **ADR-002**: NATS over Kafka for event bus (lighter, sufficient for our scale)
- **ADR-003**: Prisma over TypeORM (type safety, migration UX)
- **ADR-004**: Fastify over Express (performance, TypeScript support)
- **ADR-005**: Fail-closed security model (deny on service failure)
- **ADR-006**: Plugin architecture over monolithic engine (extensibility)
- **ADR-007**: Evidence chain with cryptographic integrity (audit trail)

## Further Reading

- [Getting Started](docs/getting-started/quickstart.md)
- [Deployment Guide](docs/deployment/docker.md)
- [API Reference](docs/api/)
- [Compliance Packs](docs/compliance/)
- [Security Model](SECURITY_MODEL.md)
- [Threat Model](THREAT_MODEL.md)
