# ACG Threat Model

This document identifies potential threats to the ACG platform and describes mitigation strategies.

## Methodology

This threat model follows the [STRIDE](https://en.wikipedia.org/wiki/STRIDE_(threat_model)) framework:

- **S**poofing — Impersonating a user or system
- **T**ampering — Modifying data or code
- **R**epudiation — Denying actions
- **I**nformation Disclosure — Exposing sensitive data
- **D**enial of Service — Making system unavailable
- **E**levation of Privilege — Gaining unauthorized access

## System Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    ACG System Boundary                   │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Gateway  │  │  Admin   │  │Dashboard │  │  CLI   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬───┘  │
│       │              │              │              │      │
│  ┌────▼──────────────▼──────────────▼──────────────▼──┐  │
│  │                    Kernel                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Infrastructure                        │  │
│  │  PostgreSQL │ Redis │ NATS │ Keycloak │ OPA       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────┐
│  External Systems │
│  (AI Providers)   │
└──────────────────┘
```

## Threats

### T1: API Key Theft

**STRIDE:** Spoofing, Information Disclosure

**Scenario:** Attacker obtains a valid API key through:
- Code repository exposure
- Log file leakage
- Network interception
- Social engineering
- Compromised developer machine

**Impact:** High — Attacker can impersonate the organization, access AI providers, and generate costs.

**Mitigations:**
1. API keys are hashed (SHA-256) before storage
2. Keys are scoped to projects and organizations
3. Rate limiting per key
4. Key rotation support
5. Expiration dates
6. Audit trail for all key usage
7. IP allowlisting (enterprise)

**Residual Risk:** Medium — If key is in transit, TLS protects it. If key is at rest on developer machine, physical access is required.

### T2: Prompt Injection

**STRIDE:** Tampering, Elevation of Privilege

**Scenario:** Attacker crafts prompts that:
- Bypass compliance policies
- Extract sensitive data from context
- Manipulate AI output
- Execute unintended actions

**Impact:** High — Could bypass compliance enforcement, leak PHI/PII, or generate harmful content.

**Mitigations:**
1. OPA/Rego policy evaluation on input/output
2. NeMo Guardrails content safety checks
3. Input validation and sanitization
4. Output filtering and monitoring
5. Rate limiting
6. Audit trail for all requests

**Residual Risk:** Medium — LLMs are inherently vulnerable to prompt injection. Multi-layered defense reduces but doesn't eliminate risk.

### T3: Data Exfiltration

**STRIDE:** Information Disclosure

**Scenario:** Attacker extracts sensitive data through:
- AI provider responses
- Compliance evidence logs
- Database access
- Log file analysis
- Memory dumps

**Impact:** Critical — Could expose PHI, PII, or business secrets.

**Mitigations:**
1. Encryption at rest (AES-256)
2. Encryption in transit (TLS 1.3)
3. RBAC with least privilege
4. Database access controls
5. Audit trail for all data access
6. Data classification and handling policies
7. AI-BOM tracking for data lineage

**Residual Risk:** Low — Defense in depth with multiple controls.

### T4: Privilege Escalation

**STRIDE:** Elevation of Privilege

**Scenario:** Attacker gains higher privileges through:
- Exploiting RBAC bugs
- Token manipulation
- Session hijacking
- SQL injection
- Dependency vulnerabilities

**Impact:** Critical — Could gain admin access, modify policies, or delete data.

**Mitigations:**
1. RBAC with role inheritance
2. JWT token validation
3. Session management
4. Input validation
5. Parameterized queries (Prisma)
6. Dependency scanning (Dependabot)
7. Audit trail for privilege changes

**Residual Risk:** Low — Multiple controls in place.

### T5: Denial of Service

**STRIDE:** Denial of Service

**Scenario:** Attacker makes ACG unavailable through:
- Volumetric DDoS
- Application-layer attacks
- Resource exhaustion
- Dependency failures
- Database overload

**Impact:** High — Compliance enforcement stops, requests may be blocked or allowed.

**Mitigations:**
1. Rate limiting per API key
2. Request size limits
3. Timeout enforcement
4. Connection pooling
5. Auto-scaling (Kubernetes)
6. Fail-closed behavior (deny on failure)
7. Health checks and circuit breakers

**Residual Risk:** Medium — Large-scale DDoS requires infrastructure-level protection (CDN, WAF).

### T6: Supply Chain Attack

**STRIDE:** Tampering, Information Disclosure

**Scenario:** Attacker compromises:
- npm/PyPI packages
- Docker base images
- Build pipeline
- Developer dependencies
- AI model weights

**Impact:** Critical — Could inject malicious code into production.

**Mitigations:**
1. Dependency scanning (Dependabot)
2. Container image scanning (Trivy)
3. SBOM generation
4. Cosign image signing
5. Reproducible builds
6. Lock files for dependencies
7. AI-BOM for model tracking
8. Audit trail for supply chain events

**Residual Risk:** Medium — Supply chain attacks are sophisticated and hard to fully prevent.

### T7: Policy Bypass

**STRIDE:** Tampering, Elevation of Privilege

**Scenario:** Attacker bypasses compliance policies by:
- Exploiting OPA rule logic
- Manipulating input to rules
- Using race conditions
- Abusing fallback behavior
- Finding gaps in rule coverage

**Impact:** Critical — Non-compliant requests reach AI providers.

**Mitigations:**
1. Deterministic rule evaluation
2. Fail-closed behavior
3. Rule versioning and testing
4. Audit trail for all policy decisions
5. Regular rule reviews
6. Community rule contributions
7. Gap analysis engine

**Residual Risk:** Low — Deterministic evaluation + fail-closed is strong.

### T8: Man-in-the-Middle

**STRIDE:** Spoofing, Tampering, Information Disclosure

**Scenario:** Attacker intercepts:
- Client → Gateway traffic
- Gateway → Provider traffic
- Internal service communication

**Impact:** Critical — Could read/modify all traffic.

**Mitigations:**
1. TLS 1.3 everywhere
2. Certificate pinning (enterprise)
3. Internal service mesh
4. mTLS for service communication
5. Audit trail for connection events

**Residual Risk:** Low — TLS is well-established.

### T9: Insider Threat

**STRIDE:** Tampering, Information Disclosure, Repudiation

**Scenario:** Malicious insider:
- Accesses data they shouldn't
- Modifies policies to allow violations
- Exfiltrates data
- Covers tracks

**Impact:** Critical — Insider has legitimate access.

**Mitigations:**
1. RBAC with least privilege
2. Audit trail for all actions
3. No single-person access to critical systems
4. Regular access reviews
5. Separation of duties
6. Integrity chain for audit entries

**Residual Risk:** Medium — Insider threats are hard to fully prevent.

### T10: Compliance Evidence Tampering

**STRIDE:** Tampering, Repudiation

**Scenario:** Attacker modifies:
- Audit log entries
- Compliance scores
- Evidence chain
- Policy decisions

**Impact:** Critical — Undermines compliance posture.

**Mitigations:**
1. Cryptographic chaining of evidence entries
2. Append-only audit log
3. Regular integrity verification
4. Backup and retention policies
5. Access controls on audit data

**Residual Risk:** Low — Cryptographic chaining makes tampering detectable.

## Risk Matrix

| Threat | Likelihood | Impact | Risk | Mitigation Status |
|--------|-----------|--------|------|-------------------|
| T1: API Key Theft | Medium | High | High | ✅ Mitigated |
| T2: Prompt Injection | High | High | Critical | ⚠️ Partially Mitigated |
| T3: Data Exfiltration | Low | Critical | High | ✅ Mitigated |
| T4: Privilege Escalation | Low | Critical | High | ✅ Mitigated |
| T5: Denial of Service | Medium | High | High | ⚠️ Partially Mitigated |
| T6: Supply Chain Attack | Low | Critical | High | ⚠️ Partially Mitigated |
| T7: Policy Bypass | Low | Critical | High | ✅ Mitigated |
| T8: Man-in-the-Middle | Low | Critical | High | ✅ Mitigated |
| T9: Insider Threat | Low | Critical | High | ⚠️ Partially Mitigated |
| T10: Evidence Tampering | Low | Critical | High | ✅ Mitigated |

## Recommendations

### Short Term (v3.0)

1. Implement rate limiting at infrastructure level (CDN/WAF)
2. Add SBOM generation to CI/CD
3. Implement key rotation automation
4. Add dependency lock file validation

### Medium Term (v4.0)

1. Implement mTLS for internal services
2. Add real-time anomaly detection
3. Implement automated compliance evidence verification
4. Add penetration testing to security process

### Long Term (v5.0)

1. Achieve SOC 2 Type II certification
2. Implement zero-trust network architecture
3. Add hardware security module (HSM) support
4. Implement confidential computing for sensitive workloads

## References

- [STRIDE Threat Model](https://en.wikipedia.org/wiki/STRIDE_(threat_model))
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [MITRE ATT&CK](https://attack.mitre.org/)

## Contact

For security concerns, contact [security@acg.dev](mailto:security@acg.dev).
