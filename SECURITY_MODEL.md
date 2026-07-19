# ACG Security Model

This document describes ACG's security architecture, principles, and controls.

## Security Principles

### 1. Fail Closed

ACG's default state is deny. When any component is unreachable or returns an error, ACG denies the request rather than silently allowing it through.

```
Client → Gateway → OPA → Allow/Deny
                   │
                   └── OPA unreachable → DENY (fail closed)
```

This is the opposite of "fail open" which would allow unvalidated requests to reach AI providers.

### 2. Defense in Depth

Multiple layers of security controls protect against different attack vectors:

| Layer | Control | Purpose |
|-------|---------|---------|
| Network | TLS 1.3 | Encrypt data in transit |
| Network | CORS | Restrict cross-origin access |
| Network | Rate limiting | Prevent abuse |
| Auth | API keys | Authenticate API clients |
| Auth | JWT/SSO | Authenticate dashboard users |
| Auth | RBAC | Authorize actions |
| Policy | OPA/Rego | Enforce compliance rules |
| Policy | NeMo Guardrails | Content safety |
| Data | Encryption at rest | Protect stored data |
| Audit | Audit trail | Track all actions |
| Supply | SBOM/AI-BOM | Track dependencies |
| Container | Non-root, read-only | Limit container attack surface |

### 3. Zero Trust

ACG assumes no implicit trust:
- Every request is authenticated
- Every action is authorized
- Every decision is logged
- Every component is verified
- No internal service is trusted without proof

### 4. Least Privilege

Users and services receive only the minimum permissions needed:
- RBAC with 5 granular roles
- API keys scoped to projects
- Database access restricted by role
- Container runs as non-root

### 5. Separation of Concerns

Different security domains are isolated:
- Authentication (Keycloak) is separate from authorization (RBAC)
- Policy evaluation (OPA) is separate from content safety (NeMo)
- Data storage (PostgreSQL) is separate from caching (Redis)
- Event bus (NATS) is separate from message queue

## Authentication

### API Key Authentication

```
Client → X-Api-Key header → Gateway → SHA-256 hash → PostgreSQL lookup
                                                          │
                                                    1-min Redis cache
```

**Properties:**
- Keys are hashed before storage (never stored in plaintext)
- Keys are scoped to projects and organizations
- Keys can have expiration dates
- Key rotation is supported
- Invalid keys return 401 (no information leakage)

### JWT/SSO Authentication

```
Client → Keycloak → JWT token → Gateway → JWT validation → User context
```

**Properties:**
- JWT tokens are validated against Keycloak's public keys
- Tokens have configurable expiration
- Refresh tokens are supported
- SSO/SAML for enterprise identity providers

### Service-to-Service Authentication

Internal services communicate via:
- NATS with authentication
- PostgreSQL with SSL connections
- Redis with password authentication

## Authorization

### RBAC Model

```
Owner (100%)
  └── Admin (80%)
        └── Compliance Officer (60%)
              └── Developer (40%)
                    └── Viewer (20%)
```

**Role Permissions:**

| Permission | Owner | Admin | Compliance | Developer | Viewer |
|------------|-------|-------|------------|-----------|--------|
| Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| Write | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Billing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Policies | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Audit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export Audit | ✅ | ✅ | ✅ | ❌ | ❌ |

### API Key Scoping

API keys are scoped to:
- **Project**: Can only access one project
- **Organization**: Can access all projects in the organization
- **Permissions**: Can be restricted to specific actions

## Data Protection

### Encryption

| State | Method | Standard |
|-------|--------|----------|
| In Transit | TLS 1.3 | Industry standard |
| At Rest | AES-256 | Database encryption |
| API Keys | SHA-256 hash | One-way hash |
| JWT | RS256 | Asymmetric signing |

### Data Classification

| Data | Classification | Protection |
|------|---------------|------------|
| API Keys | Secret | Hashed, rotated |
| PII | Confidential | Encrypted, access-controlled |
| Compliance Evidence | Sensitive | Integrity-chained, audit-logged |
| Configuration | Internal | Access-controlled |
| Logs | Internal | Retention policy |

### Database Security

- PostgreSQL with SSL connections
- Connection pooling (pgbouncer)
- Row-level security (RLS) enabled
- Regular backups with point-in-time recovery
- Access restricted to internal network

## Policy Enforcement

### OPA Integration

```
Request → Gateway → OPA sidecar → Policy evaluation → Allow/Deny
                                        │
                                   Rego rules
                                   (deterministic)
```

**Properties:**
- Deterministic evaluation (same input → same output)
- No side effects in rules
- Rules are versioned and auditable
- Custom rules can be added via plugin system

### Fail-Closed Behavior

```typescript
// In gateway middleware
try {
  const result = await opa.evaluate(input);
  if (result.allow) return next();
  return reply.code(403).send({ error: 'Denied by policy' });
} catch (error) {
  // OPA unreachable → DENY
  return reply.code(503).send({ error: 'Policy engine unavailable' });
}
```

### Content Safety (NeMo Guardrails)

```
Request → NeMo Guardrails → Safety check → Allow/Deny
                         │
                    LLM-based checks
                    (toxicity, bias, etc.)
```

## Audit Trail

### What is Logged

Every action produces an audit entry:
- **Who**: User ID, API key ID, IP address
- **What**: Action, resource, result
- **When**: Timestamp with timezone
- **Where**: Service, endpoint, request ID
- **Why**: Policy decision, compliance rule

### Audit Entry Structure

```json
{
  "id": "evt_123",
  "timestamp": "2024-12-01T10:00:00Z",
  "actor": {
    "type": "api_key",
    "id": "key_456",
    "organization": "org_789"
  },
  "action": "chat.completions.create",
  "resource": "request_req_012",
  "result": "denied",
  "reason": "HIPAA_PHI_DETECTED",
  "metadata": {
    "rule_id": "hipaa_001",
    "confidence": 0.95,
    "evidence_chain_id": "chain_345"
  }
}
```

### Integrity Chain

Audit entries are chained cryptographically:
```
Entry 1 → Entry 2 → Entry 3 → ...
   │          │          │
SHA-256    SHA-256    SHA-256
(previous) (previous) (previous)
```

Any tampering with a previous entry breaks the chain.

## Supply Chain Security

### Dependencies

- Automated dependency updates via Dependabot
- Security advisories monitored
- SBOM generated for all releases
- Container image scanning via Trivy

### Container Security

- All images use non-root users (acg:acg)
- Read-only filesystem where possible
- No unnecessary capabilities
- Dumb-init for proper signal handling
- Health checks on all services

### Release Signing

- Docker images signed with cosign
- npm packages published with provenance
- Release artifacts include SHA-256 checksums

## Compliance Controls

### OWASP ASVS Level 2

- Authentication: API keys, JWT, SSO
- Authorization: RBAC with 5 roles
- Session Management: Token-based, configurable expiration
- Input Validation: Request schema validation
- Error Handling: Centralized, no information leakage
- Cryptography: TLS 1.3, AES-256, SHA-256
- Data Protection: Encryption at rest and in transit
- Logging: Comprehensive audit trail

### OWASP LLM Top 10

| Risk | Mitigation |
|------|-----------|
| LLM01: Prompt Injection | Input validation, NeMo Guardrails |
| LLM02: Insecure Output | Output sanitization, content filtering |
| LLM03: Training Data | AI-BOM tracking, data lineage |
| LLM04: Model Denial | Rate limiting, quota enforcement |
| LLM05: Improper Access | RBAC, API key scoping |
| LLM06: Excessive Agency | Policy enforcement, audit trail |
| LLM07: System Prompt Leakage | Prompt registry, access control |
| LLM08: Data Poisoning | Supply chain security, SBOM |
| LLM09: Misinformation | Fact checking, confidence scoring |
| LLM10: Unbounded Consumption | Rate limiting, usage tracking |

### SOC 2 Alignment

| Criterion | Control |
|-----------|---------|
| CC6.1 | Logical access controls (RBAC, API keys) |
| CC6.2 | User registration and provisioning |
| CC6.3 | User removal and access revocation |
| CC6.6 | Encryption in transit and at rest |
| CC7.1 | Vulnerability management |
| CC7.2 | Intrusion detection (audit trail) |
| A1.2 | Recovery procedures (backup/restore) |

## Security Testing

| Type | Tool | Frequency |
|------|------|-----------|
| SAST | CodeQL | Every PR |
| SCA | Dependabot | Daily |
| Container Scan | Trivy | Every build |
| Secret Scanning | GitHub | Every push |
| DAST | Manual | Quarterly |
| Penetration Test | External | Annually |

## Incident Response

1. **Detection** — Monitoring alerts, user reports
2. **Triage** — Assess severity (Critical/High/Medium/Low)
3. **Containment** — Isolate affected components
4. **Eradication** — Fix root cause
5. **Recovery** — Restore service
6. **Post-mortem** — Document and improve

## Security Updates

| Severity | Response Time |
|----------|--------------|
| Critical | Patch within 24 hours |
| High | Patch within 7 days |
| Medium | Patch within 30 days |
| Low | Included in next release |

## Contact

- **Security:** [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com)
- **General:** [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com)
