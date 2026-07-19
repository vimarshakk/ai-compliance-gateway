# Security Policy

## Reporting a Vulnerability

ACG takes security seriously. If you discover a security vulnerability in ACG, please report it responsibly.

**Do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: Send a detailed report to [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com)
2. **GitHub Security Advisories**: Use [GitHub's private vulnerability reporting](https://github.com/acg-ai/acg/security/advisories/new)
3. **Response Time**: We acknowledge reports within 48 hours and provide a remediation timeline within 7 business days

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### What to Expect

- **Acknowledgment** within 48 hours
- **Assessment** within 7 business days
- **Remediation plan** within 14 business days
- **Credit** in the security advisory and CHANGELOG

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | ✅ Active support |
| 1.x     | ⚠️ Security fixes only |
| < 1.0   | ❌ No support |

## Security Features

### Authentication & Authorization

- API key-based authentication with configurable rotation
- RBAC with 5 granular roles (owner, admin, compliance-officer, developer, viewer)
- JWT token validation via Keycloak
- SSO/SAML support for enterprise deployments

### Data Protection

- All data in transit encrypted via TLS 1.3
- Database encryption at rest
- API keys hashed with bcrypt before storage
- Audit trail for all data access
- Evidence chain with integrity verification

### Policy Engine

- Fail-closed policy enforcement (deny when services unreachable)
- OPA/Rego policy evaluation with deterministic results
- Policy versioning and rollback support
- Rule sandboxing for community plugins

### Supply Chain Security

- Dependency scanning via Dependabot
- Container image signing with cosign
- SBOM generation for all releases
- AI-BOM tracking for AI components

### Network Security

- CORS configuration with explicit allowlists
- Rate limiting per API key
- Request size limits
- Timeout enforcement
- Health check endpoints isolated from business logic

## Infrastructure Security

### Docker

- All images use non-root users (acg:acg)
- Read-only filesystem where possible
- No unnecessary capabilities
- Health checks on all services
- Dumb-init for proper signal handling

### Kubernetes

- Pod security policies
- Network policies
- Resource limits and requests
- Secret management via Kubernetes secrets
- RBAC for service accounts

### Database

- PostgreSQL with SSL connections
- Connection pooling with pgbouncer
- Regular backup schedule
- Point-in-time recovery
- Access restricted to internal network

## Compliance Controls

ACG implements controls aligned with:

- **OWASP ASVS** Level 2
- **OWASP LLM Top 10** — all 10 categories addressed
- **SOC 2** — access control, change management, incident response
- **ISO 27001** — information security management
- **NIST Cybersecurity Framework** — identify, protect, detect, respond, recover

## Security Testing

- Static Application Security Testing (SAST) via CodeQL
- Software Composition Analysis (SCA) via Dependabot
- Container scanning via Trivy
- Secret scanning via GitHub
- Regular penetration testing (quarterly)

## Security Updates

Security patches are released as soon as possible. Critical vulnerabilities receive:

- **Critical**: Patch within 24 hours
- **High**: Patch within 7 days
- **Medium**: Patch within 30 days
- **Low**: Included in next regular release

## Contact

- **Security Team**: [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com)
- **General Inquiries**: [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com)
