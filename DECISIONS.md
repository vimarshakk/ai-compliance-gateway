# Architecture Decision Records

This file tracks all Architecture Decision Records (ADRs) for the ACG project.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](docs/adr/001-use-opa-for-policy.md) | Use OPA for Policy Evaluation | ✅ Accepted | 2024-06-01 |
| [ADR-002](docs/adr/002-use-nats-for-event-bus.md) | Use NATS for Event Bus | ✅ Accepted | 2024-06-01 |
| [ADR-003](docs/adr/003-use-prisma-for-database.md) | Use Prisma for Database Access | ✅ Accepted | 2024-06-01 |
| [ADR-004](docs/adr/004-use-fastify-for-http.md) | Use Fastify for HTTP Servers | ✅ Accepted | 2024-06-01 |
| [ADR-005](docs/adr/005-fail-closed-security.md) | Fail-Closed Security Model | ✅ Accepted | 2024-06-01 |

## Creating New ADRs

1. Copy the [ADR Template](docs/adr/TEMPLATE.md)
2. Number sequentially (next is ADR-006)
3. Fill in all sections
4. Submit as a Pull Request
5. Discuss for at least 7 days
6. Core team decides
7. Update this index

## ADR Lifecycle

- **Proposed** — Under discussion
- **Accepted** — Decision made and implemented
- **Deprecated** — No longer relevant
- **Superseded** — Replaced by a newer ADR
