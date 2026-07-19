# ADR-003: Versioned Configuration per Upstream

## Status
Accepted

## Context
Each upstream service (LiteLLM, OPA, Presidio, NeMo Guardrails, Kong, Prometheus, Grafana, etc.) needs different configuration for development, staging, and production environments.

## Decision
Create a `configs/<service>/` directory for each upstream with files:
- `base.yaml` — Default configuration
- `dev.yaml` — Development overrides (relaxed limits, verbose logging)
- `staging.yaml` — Staging configuration (moderate limits)
- `production.yaml` — Production configuration (strict limits, security hardened)

## Consequences
### Positive
- Clear separation of environment-specific config
- Easy to diff between environments
- Version-controlled configuration
- Docker Compose can mount different configs per profile

### Negative
- Config duplication between environments
- Must keep configs in sync when upstream changes
