# ADR-007: Connectors Over Adapters

## Status
Accepted

## Context
We need a consistent interface for communicating with upstream services. The naming convention matters for clarity.

## Decision
Use the term "connectors" for HTTP/gRPC clients that talk to upstream services. Each connector:
- Extends `BaseConnector` with health check and request helpers
- Implements a specific interface from `packages/connectors/src/interfaces/`
- Lives in `packages/connectors/src/clients/`
- Is exported from `packages/connectors/src/index.ts`

## Consequences
### Positive
- "Connectors" implies active communication (HTTP/gRPC calls)
- "Adapters" implies data transformation (which we also do but less prominently)
- Consistent naming across the codebase

### Negative
- Minor naming bikeshedding risk
