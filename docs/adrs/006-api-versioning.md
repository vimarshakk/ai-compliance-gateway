# ADR-006: API Versioning (v1/v2)

## Status
Accepted

## Context
The admin API needs to evolve without breaking existing clients. Different API versions may have different response shapes and features.

## Decision
Implement API versioning in the admin service with explicit v1 and v2 route directories:
- `apps/admin/src/v1/` — Current stable API
- `apps/admin/src/v2/` — Next version with bulk operations, analytics, compliance reports
- Gateway routes are always `/v1/` since they're the public interface

## Consequences
### Positive
- Backward compatibility guaranteed
- New features can be added to v2 without breaking v1
- Clear migration path for clients
- Version-specific documentation

### Negative
- Code duplication between versions
- Must maintain v1 until all clients migrate
