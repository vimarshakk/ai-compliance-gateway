# ADR-008: Separate Contracts Package

## Status
Accepted

## Context
API schemas (Zod validation, OpenAPI specs, TypeScript types) need to be shared between gateway, admin, evaluator, and SDK. But they're different from utility code.

## Decision
Create a separate `packages/contracts` package for:
- Zod validation schemas
- OpenAPI specifications
- Request/response DTOs
- Shared type definitions (re-exported from `@acg/shared`)

## Consequences
### Positive
- Single source of truth for API contracts
- Client and server share the same validation logic
- OpenAPI specs can be auto-generated from Zod schemas
- Clear separation of concerns (contracts vs utilities)

### Negative
- Additional package to maintain
- Must keep contracts in sync with actual API behavior
