# ADR-003: Use Prisma for Database Access

**Date:** 2024-06-01

**Status:** Accepted

**Deciders:** ACG Core Team

## Context

ACG needs a database ORM for:
- Type-safe database queries
- Schema management and migrations
- TypeScript integration
- PostgreSQL support
- Developer experience

Options considered:
1. Prisma
2. TypeORM
3. Drizzle ORM
4. Raw SQL with pg driver

## Decision

We use **Prisma** as the primary ORM with PostgreSQL.

## Consequences

### Positive

- **Type safety** — End-to-end type safety from schema to queries
- **Migration system** — Excellent migration tooling
- **Developer experience** — Prisma Studio, good documentation
- **PostgreSQL support** — First-class support
- **Auto-generated client** — No manual type definitions needed

### Negative

- **Migration complexity** — Prisma migrations can be complex for large schemas
- **Performance** — Slightly slower than raw SQL for complex queries
- **Bundle size** — Prisma client is large
- **Vendor lock-in** — Prisma-specific syntax

### Risks

- Prisma abandonment → Mitigated by large community and CNCF adoption
- Performance issues → Mitigated by raw SQL escape hatch for hot paths
- Migration issues → Mitigated by careful testing and review

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| TypeORM | Mature, decorator-based | Less type-safe, verbose | Worse DX than Prisma |
| Drizzle ORM | Lightweight, SQL-like | Less mature, smaller ecosystem | Too new for production |
| Raw SQL | Maximum performance | No type safety, manual migrations | Developer experience |

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma vs TypeORM](https://www.prisma.io/docs/concepts/more/comparisons/prisma-and-typeorm)
- [Prisma vs Drizzle](https://www.prisma.io/docs/concepts/more/comparisons/prisma-and-drizzle)

## Review

Review when:
- Schema exceeds 100 models
- Performance issues with Prisma
- Better ORM alternatives emerge
