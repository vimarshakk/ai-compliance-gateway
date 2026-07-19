# ADR-004: Use Fastify for HTTP Servers

**Date:** 2024-06-01

**Status:** Accepted

**Deciders:** ACG Core Team

## Context

ACG needs an HTTP framework for:
- Gateway (high-throughput AI proxy)
- Admin API (CRUD operations)
- WebSocket support (SSE streaming)

Requirements:
- High performance (sub-millisecond overhead)
- TypeScript support
- Schema validation
- Plugin system
- SSE support
- Active maintenance

Options considered:
1. Fastify
2. Express
3. Hono
4. NestJS (framework, not just HTTP)

## Decision

We use **Fastify** as the HTTP framework for both Gateway and Admin API.

## Consequences

### Positive

- **Performance** — 2-3x faster than Express
- **TypeScript** — First-class support
- **Schema validation** — Built-in JSON Schema validation
- **Plugin system** — Excellent for middleware composition
- **SSE support** — Good streaming support
- **Active maintenance** — Regular releases, large community

### Negative

- **Learning curve** — Different from Express
- **Smaller ecosystem** — Fewer plugins than Express
- **Migration effort** — Express plugins not directly compatible

### Risks

- Fastify abandonment → Mitigated by active community and Cloudflare backing
- Performance regression → Mitigated by benchmark testing

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Express | Largest ecosystem, familiar | Slow, no built-in types | Performance and DX |
| Hono | Very fast, edge-ready | Newer, smaller ecosystem | Too new for production |
| NestJS | Full framework, DI | Heavyweight, overkill | Too much overhead |

## References

- [Fastify Documentation](https://www.fastify.io/docs/)
- [Fastify vs Express](https://www.fastify.io/docs/latest/Benchmarks/)
- [Fastify Plugins](https://www.fastify.io/docs/latest/Plugins/)

## Review

Review when:
- Performance requirements change
- Better HTTP frameworks emerge
- Fastify limitations become a blocker
