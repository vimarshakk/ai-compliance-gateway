# ADR-002: Monorepo with Turborepo

## Status
Accepted

## Context
We have multiple packages (shared, contracts, connectors, workflows, sdk-typescript) and apps (gateway, admin, evaluator, dashboard) that share types and utilities.

## Decision
Use a monorepo managed by Turborepo with pnpm workspaces. Each package/app is independently buildable and publishable.

## Consequences
### Positive
- Shared types across all packages
- Atomic commits across the entire codebase
- Turborepo caching for fast builds
- pnpm for efficient dependency management

### Negative
- Larger git history
- Requires pnpm and Turborepo tooling
- CI/CD must handle monorepo-specific logic
