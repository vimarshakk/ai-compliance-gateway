# ADR-004: Event-Driven Architecture with NATS

## Status
Accepted

## Context
We need a way to decouple workflow steps, enable audit logging, and support real-time monitoring across the gateway, admin, and evaluator services.

## Decision
Use NATS as the unified event bus. All workflows publish events at each step. Audit logs are consumed from NATS and written to ClickHouse/PostgreSQL.

## Consequences
### Positive
- Decoupled services (gateway doesn't need to know about audit storage)
- Real-time monitoring via NATS subscriptions
- Event replay capability for debugging
- Low latency, high throughput messaging

### Negative
- Additional infrastructure dependency
- Event schema evolution requires careful versioning
- Debugging distributed flows is harder than synchronous calls
