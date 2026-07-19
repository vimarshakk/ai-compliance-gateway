# ADR-001: Use OPA for Policy Evaluation

**Date:** 2024-06-01

**Status:** Accepted

**Deciders:** ACG Core Team

## Context

ACG needs a policy engine to evaluate compliance rules against AI requests and responses. The engine must:

- Support complex boolean logic
- Be deterministic (same input → same output)
- Have a rich ecosystem of tools and libraries
- Be performant (sub-millisecond evaluation)
- Be auditable and testable
- Support hot-reloading of rules

Options considered:
1. Custom TypeScript rule engine
2. OPA (Open Policy Agent)
3. AWS Cedar
4. Casbin

## Decision

We use **OPA (Open Policy Agent)** as the primary policy evaluation engine.

Rules are written in **Rego**, OPA's policy language, and evaluated via the OPA sidecar over HTTP.

## Consequences

### Positive

- **Industry standard** — OPA is used by Google, Netflix, Cloudflare, and others
- **Rego language** — Purpose-built for policy, supports complex logic
- **Deterministic** — No side effects, pure functions
- **Hot-reload** — Rules can be updated without restarts
- **Rich ecosystem** — Rego libraries, testing tools, IDE support
- **Auditable** — Every evaluation produces structured output
- **Performant** — Sub-millisecond evaluation for most rules

### Negative

- **Rego learning curve** — Team must learn Rego syntax
- **External dependency** — OPA must be deployed as a sidecar
- **Complex rules** — Some business logic is awkward in Rego
- **Versioning** — OPA version upgrades require testing

### Risks

- OPA becomes unmaintained → Mitigated by CNCF backing and large community
- Rego limitations → Mitigated by supporting JavaScript/Python rules as alternatives
- Performance at scale → Mitigated by caching and rule optimization

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Custom TypeScript engine | Full control, no dependency | Maintenance burden, reinventing the wheel | Too much effort to build a robust engine |
| AWS Cedar | AWS-native, good performance | AWS lock-in, smaller ecosystem | Vendor lock-in risk |
| Casbin | Multi-language, RBAC support | Less mature, fewer tools | Smaller community |

## References

- [OPA Documentation](https://www.openpolicyagent.org/docs/)
- [Rego Language](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [OPA in Production](https://www.openpolicyagent.org/docs/latest/deployments/)

## Review

Review when:
- OPA releases a major version
- Performance requirements change significantly
- New policy engine alternatives emerge
