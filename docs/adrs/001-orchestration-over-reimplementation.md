# ADR-001: Orchestration Over Reimplementation

## Status
Accepted

## Context
We need to build an AI compliance gateway that handles PII detection, policy evaluation, prompt firewall, model routing, audit logging, and compliance pack enforcement. There are 41 upstream open-source repositories available that provide this functionality.

## Decision
We will orchestrate upstream services via official Docker images rather than reimplementing their functionality. Our codebase will contain:
- **Connectors**: HTTP/gRPC clients for each upstream service
- **Workflows**: Orchestration logic that chains connectors
- **APIs**: HTTP endpoints (gateway, admin, evaluator)
- **Dashboard**: Admin UI (Next.js)
- **SDK**: Client libraries for customers
- **Configs**: Versioned configuration for each upstream
- **Policies**: Rego policies loaded by OPA
- **Deployment**: Docker Compose, Helm, Terraform

## Consequences
### Positive
- Zero upstream logic reimplemented
- Every upstream can be swapped independently
- Configuration is the differentiator, not code
- Testing is simpler (mock connectors, not entire systems)
- Upstream upgrades are free (just update Docker image tags)

### Negative
- Dependency on upstream availability and Docker image quality
- More moving parts in deployment
- Debugging requires understanding the full stack

## Alternatives Considered
1. **Reimplement from scratch**: High risk, high effort, low differentiation
2. **Fork and modify**: Maintenance burden, divergence from upstream
3. **Hybrid (some reimplemented)**: Confusing, mixed abstractions
