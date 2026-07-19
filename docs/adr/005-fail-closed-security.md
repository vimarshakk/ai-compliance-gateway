# ADR-005: Fail-Closed Security Model

**Date:** 2024-06-01

**Status:** Accepted

**Deciders:** ACG Core Team

## Context

ACG enforces compliance policies on AI requests. When policy enforcement components (OPA, NeMo Guardrails) are unavailable, we must decide whether to:

1. **Fail open** — Allow requests to proceed without policy checks
2. **Fail closed** — Deny requests when policy checks cannot be performed

This is a critical security decision with significant implications.

## Decision

We implement a **fail-closed** security model. When any policy enforcement component is unreachable or returns an error, ACG denies the request.

```
Request → Gateway → OPA → Allow → Proceed
                │
                └── OPA unreachable → DENY (fail closed)
```

## Consequences

### Positive

- **Security by default** — No request bypasses policy enforcement
- **Compliance guarantee** — All allowed requests have been policy-checked
- **Audit integrity** — Every allowed request has a policy decision
- **Trust** — Enterprise customers can trust that policies are enforced
- **No silent failures** — Problems are immediately visible

### Negative

- **Availability impact** — OPA downtime blocks all requests
- **Operational burden** — Must ensure high availability of policy engines
- **User experience** — Users see 503 errors when policy engines are down
- **Monitoring required** — Must monitor policy engine health

### Risks

- OPA outage blocks all traffic → Mitigated by:
  - OPA health checks in gateway
  - Monitoring and alerting
  - Redundant OPA instances
  - Circuit breaker pattern (fail fast, don't wait for timeout)

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Fail open | Better availability | Security risk, compliance gap | Unacceptable for regulated industries |
| Hybrid (configurable) | Flexibility | Complexity, misconfiguration risk | Too error-prone |
| Cached policies | Availability | Stale policies, security risk | Policies must be fresh |

## Implementation

```typescript
// Gateway middleware
async function policyCheck(request, reply) {
  try {
    const result = await opa.evaluate({
      method: request.method,
      path: request.url,
      headers: request.headers,
      body: request.body,
    });

    if (result.allow) {
      request.policyDecision = result;
      return next();
    }

    return reply.code(403).send({
      error: 'Denied by policy',
      rule: result.rule,
      reason: result.reason,
    });
  } catch (error) {
    // OPA unreachable → DENY (fail closed)
    request.log.error('Policy engine unavailable', { error: error.message });
    return reply.code(503).send({
      error: 'Policy engine unavailable',
      message: 'Request denied due to policy engine failure',
    });
  }
}
```

## Monitoring

- **Health checks** — Monitor OPA and NeMo Guardrails availability
- **Alerting** — Alert on policy engine failures
- **Metrics** — Track policy evaluation latency and error rates
- **Dashboard** — Real-time policy engine status

## References

- [Fail Open vs Fail Closed](https://en.wikipedia.org/wiki/Fail-open_and_fail-closed)
- [OWASP ASVS V1.12](https://owasp.org/www-project-application-security-verification-standard/)
- [Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final)

## Review

Review when:
- Availability requirements change significantly
- Policy engine reliability improves dramatically
- New compliance frameworks require different behavior
