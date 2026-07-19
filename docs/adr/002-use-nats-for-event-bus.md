# ADR-002: Use NATS for Event Bus

**Date:** 2024-06-01

**Status:** Accepted

**Deciders:** ACG Core Team

## Context

ACG needs an event bus for:
- Decoupling components (gateway, admin, kernel, engines)
- Async processing (evidence capture, compliance scoring)
- Real-time updates (dashboard, webhooks)
- Audit trail (event sourcing)

Requirements:
- Low latency (< 1ms for local events)
- At-least-once delivery (for evidence chain)
- Lightweight deployment
- Good TypeScript/Node.js support
- Message persistence (for audit)

Options considered:
1. NATS
2. Apache Kafka
3. RabbitMQ
4. Redis Streams

## Decision

We use **NATS** as the event bus with NATS JetStream for persistence.

## Consequences

### Positive

- **Lightweight** — Single binary, minimal resource usage
- **Fast** — Sub-millisecond latency for pub/sub
- **Simple** — Easy to deploy and operate
- **JetStream** — Provides persistence and at-least-once delivery
- **TypeScript support** — `nats` npm package with good TypeScript types
- **Scalable** — Clustering support for production

### Negative

- **Simpler than Kafka** — Less suitable for complex event streaming patterns
- **Smaller ecosystem** — Fewer connectors and tools than Kafka
- **JetStream maturity** — Less battle-tested than Kafka's persistence

### Risks

- Message loss → Mitigated by JetStream persistence
- Single point of failure → Mitigated by NATS clustering
- Scale limits → Mitigated by horizontal scaling

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Apache Kafka | Battle-tested, rich ecosystem | Heavyweight, complex deployment | Overkill for our scale |
| RabbitMQ | Mature, flexible routing | Higher latency, more complex | Complexity not justified |
| Redis Streams | Already using Redis, simple | Less feature-rich than NATS | Less suitable for event bus |

## References

- [NATS Documentation](https://docs.nats.io/)
- [NATS JetStream](https://docs.nats.io/nats-concepts/jetstream)
- [nats npm package](https://www.npmjs.com/package/nats)

## Review

Review when:
- Scale exceeds 10K events/second
- Need for complex event streaming patterns
- NATS JetStream limitations become a blocker
