# ACG Roadmap

This document outlines the development roadmap for AI Compliance Gateway (ACG).

## Vision

Make ACG the industry standard for AI Governance & Compliance — the "Cloudflare for Enterprise AI."

## Release Strategy

- **Patch releases** (2.x.y): Bug fixes, security patches, documentation
- **Minor releases** (x.0.0): New features, compliance packs, SDK improvements
- **Major releases** (X.0.0): Breaking changes, architecture evolution

## Roadmap

### v2.x — Foundation (Current)

**Status:** ✅ Complete

| Feature | Status |
|---------|--------|
| AI Gateway with OPA + NeMo Guardrails | ✅ |
| Admin API with Prisma + PostgreSQL | ✅ |
| Dashboard (Next.js) | ✅ |
| CLI (11 commands) | ✅ |
| Platform Kernel (plugin runtime, rule engine, registry) | ✅ |
| AI-BOM (Asset Graph Engine) | ✅ |
| Compliance Score Engine | ✅ |
| Evidence Engine | ✅ |
| MCP Server (7 tools) | ✅ |
| VS Code Extension | ✅ |
| GitHub Action | ✅ |
| Marketplace (8 built-in packs) | ✅ |
| Enterprise Packs (HIPAA, PCI-DSS, SOC2, ABDM, AI Safety, Banking) | ✅ |
| RBAC (5 roles with inheritance) | ✅ |
| Audit Trail | ✅ |
| SSO Stub (SAML/OIDC/Azure AD) | ✅ |
| Billing & Subscriptions | ✅ |
| 300+ tests | ✅ |

### v3.0 — Community & Polish

**Target:** Q1 2025

| Feature | Priority | Status |
|---------|----------|--------|
| Documentation site (Mintlify) | P0 | 🔄 In Progress |
| SDK v3 (TypeScript, Python, Go) | P0 | 🔄 In Progress |
| Helm chart for Kubernetes | P0 | 🔄 In Progress |
| ADR process + first ADRs | P0 | 🔄 In Progress |
| Style guide + contributor guide polish | P0 | 🔄 In Progress |
| CI/CD hardening (CodeQL, Trivy, SBOM) | P0 | 🔄 In Progress |
| Plugin SDK (create your own plugins) | P1 | ⬜ Planned |
| Connector SDK (build custom connectors) | P1 | ⬜ Planned |
| Plugin sandbox runtime | P1 | ⬜ Planned |
| E2E test suite | P1 | ⬜ Planned |
| Load testing framework | P1 | ⬜ Planned |
| OpenTelemetry integration | P2 | ⬜ Planned |

### v4.0 — Enterprise

**Target:** Q2 2025

| Feature | Priority | Status |
|---------|----------|--------|
| SSO/SAML real integration (Keycloak) | P0 | ⬜ Planned |
| Custom compliance pack builder | P0 | ⬜ Planned |
| Audit report export (PDF, JSON) | P0 | ⬜ Planned |
| Model cards (per-model compliance) | P1 | ⬜ Planned |
| Risk classification engine | P1 | ⬜ Planned |
| Gap analysis with recommendations | P1 | ⬜ Planned |
| White-label dashboard | P2 | ⬜ Planned |
| Multi-tenant deployment | P2 | ⬜ Planned |
| SOC 2 Type II evidence automation | P2 | ⬜ Planned |

### v5.0 — Cloud & Scale

**Target:** Q3 2025

| Feature | Priority | Status |
|---------|----------|--------|
| Managed cloud (app.acg.ai) | P0 | ⬜ Planned |
| Cloud marketplace | P0 | ⬜ Planned |
| Usage-based billing (Stripe) | P0 | ⬜ Planned |
| Multi-region deployment | P1 | ⬜ Planned |
| Real-time compliance dashboard | P1 | ⬜ Planned |
| SIEM integration (Splunk, Sentinel) | P1 | ⬜ Planned |
| GraphQL API | P2 | ⬜ Planned |
| Webhook marketplace | P2 | ⬜ Planned |

### v6.0 — AI-Native

**Target:** Q4 2025

| Feature | Priority | Status |
|---------|----------|--------|
| AI Risk Engine (ML-based) | P0 | ⬜ Planned |
| Automated compliance remediation | P0 | ⬜ Planned |
| Predictive compliance scoring | P1 | ⬜ Planned |
| Natural language policy authoring | P1 | ⬜ Planned |
| AI-powered audit assistant | P1 | ⬜ Planned |
| Cross-framework compliance mapping | P2 | ⬜ Planned |

## Compliance Framework Roadmap

| Framework | Region | Status |
|-----------|--------|--------|
| DPDP | India | ✅ |
| HIPAA | US | ✅ |
| GDPR | EU | ✅ |
| PCI-DSS | Global | ✅ |
| SOC 2 | US | ✅ |
| ABDM | India | ✅ |
| AI Safety | Global | ✅ |
| Banking (RBI) | India | ✅ |
| ISO 27001 | Global | ⬜ Planned v4 |
| ISO 42001 | Global | ⬜ Planned v4 |
| NIST AI RMF | US | ⬜ Planned v4 |
| EU AI Act | EU | ⬜ Planned v4 |
| IRDAI | India | ⬜ Planned v5 |
| SEBI | India | ⬜ Planned v5 |

## SDK Roadmap

| Language | Status | Notes |
|----------|--------|-------|
| TypeScript | ✅ | `@acg/sdk` |
| Python | 🔄 | In Progress |
| Go | 🔄 | In Progress |
| Java | ⬜ | Planned v4 |
| .NET | ⬜ | Planned v4 |
| Rust | ⬜ | Planned v5 |
| PHP | ⬜ | Planned v5 |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas for contribution:
- New compliance packs (especially ISO, NIST, EU AI Act)
- SDK improvements
- Documentation
- Test coverage
- Plugin development

## Governance

See [GOVERNANCE.md](GOVERNANCE.md) for project governance.

## Contact

- **Discussions:** [GitHub Discussions](https://github.com/acg-ai/acg/discisions)
- **Issues:** [GitHub Issues](https://github.com/acg-ai/acg/issues)
- **Email:** [hello@acg.dev](mailto:hello@acg.dev)
