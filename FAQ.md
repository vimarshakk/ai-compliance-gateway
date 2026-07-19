# Frequently Asked Questions

## General

### What is ACG?

ACG (AI Compliance Gateway) is an open-source AI governance and compliance platform for regulated industries. It intercepts every AI request and response, applies compliance policies in real time, generates audit evidence, and produces compliance scores.

### What problems does ACG solve?

- **Regulatory compliance** — enforce HIPAA, GDPR, DPDP, PCI-DSS, SOC2, and ABDM across all AI interactions
- **Risk management** — continuous risk scoring with ML-ready signals
- **Audit readiness** — automated evidence generation and audit trails
- **Provider management** — smart routing across AI providers with fallback
- **AI-BOM** — track all AI components, models, datasets, and dependencies

### Is ACG production-ready?

ACG is in active development (v0.1.0). The core engine, compliance packs, and CLI are functional. We recommend using ACG in staging environments and providing feedback before production deployment.

### How does ACG compare to other tools?

| Feature | ACG | Guardrails AI | NeMo Guardrails | OPA |
|---------|-----|---------------|-----------------|-----|
| Real-time enforcement | ✅ | ✅ | ✅ | ✅ |
| Multi-provider routing | ✅ | ❌ | ❌ | ❌ |
| Compliance packs | 8 built-in | ❌ | ❌ | ❌ |
| AI-BOM generation | ✅ | ❌ | ❌ | ❌ |
| Plugin marketplace | ✅ | ❌ | ❌ | ❌ |
| Self-hosted | ✅ | ✅ | ✅ | ✅ |

## Installation

### What are the system requirements?

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0 (for development)
- **Docker & Docker Compose** (for running infrastructure)
- **PostgreSQL** ≥ 16 (for persistence)

### How do I install the CLI?

```bash
npm install -g @acg/cli
```

Or use `npx` for one-off commands:

```bash
npx @acg/cli@latest scan .
```

### Can I use ACG without Docker?

Yes. You can run ACG services directly with Node.js. However, you'll need to provide PostgreSQL, Redis, NATS, and OPA separately. Docker Compose is the easiest way to get started.

## Compliance

### Which compliance frameworks are supported?

ACG ships with 8 compliance packs:

1. **DPDP** — India Data Protection & Digital Privacy Act 2023
2. **HIPAA** — Health Insurance Portability & Accountability Act
3. **GDPR** — General Data Protection Regulation
4. **PCI-DSS** — Payment Card Industry Data Security Standard
5. **SOC 2** — Service Organization Control Type II
6. **ABDM** — Ayushman Bharat Digital Mission
7. **AI Safety** — Bias, toxicity, hallucination detection
8. **Banking** — RBI banking regulations

### Can I create custom compliance packs?

Yes. ACG supports custom compliance packs via OPA/Rego policies and JavaScript rules. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding a new compliance pack.

### How does ACG handle PII detection?

ACG uses Microsoft Presidio for PII detection and anonymization. PII is detected in both input and output, and can be redacted, masked, or blocked based on your compliance configuration.

## Technical

### What AI providers does ACG support?

ACG supports any OpenAI-compatible API endpoint, including:

- OpenAI (GPT-4, GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Azure OpenAI
- AWS Bedrock
- Google Vertex AI
- Any LiteLLM-compatible provider

### How does the AI Router work?

The AI Router evaluates providers based on:

- **Cost** — per-token pricing
- **Latency** — response time history
- **Compliance** — provider compliance certification
- **Availability** — circuit breaker state
- **Priority** — user-configured preferences

### What is the fail-closed behavior?

When upstream services (OPA, Presidio, Guardrails) are unreachable, ACG **denies** the request by default. This prevents uncompliant requests from reaching AI providers. You can configure fail-open behavior for non-critical services.

### How does the evidence chain work?

Every compliance decision produces a cryptographically chained audit entry. Each entry includes:

- Timestamp
- Request/response hash
- Policy decisions
- Risk scores
- Compliance evaluation results

This creates an immutable audit trail suitable for regulatory inspections.

## Development

### How do I contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### How do I run tests?

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Specific package tests
pnpm --filter @acg/cli test
```

### How do I add a new compliance pack?

1. Create a new directory in `packages/enterprise-packs/`
2. Define OPA/Rego rules
3. Add compliance framework metadata
4. Write tests for each rule
5. See [CONTRIBUTING.md](CONTRIBUTING.md) for full details

## Enterprise

### Is there a managed cloud offering?

Not yet. ACG Enterprise (managed cloud) is planned for v5.0. See [ROADMAP.md](ROADMAP.md).

### What enterprise features are available?

- SSO/SAML integration (Keycloak)
- RBAC with 5 roles
- Audit trail
- Compliance scoring
- AI-BOM generation
- Provider certification

### How do I get enterprise support?

Contact [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com) for enterprise support inquiries.

## Community

### Where can I get help?

- **GitHub Discussions** — [Ask questions](https://github.com/vimarshakk/ai-compliance-gateway/discussions)
- **Documentation** — [docs.acg.dev](https://github.com/vimarshakk/ai-compliance-gateway)
- **Issues** — [Report bugs](https://github.com/vimarshakk/ai-compliance-gateway/issues)

### How do I report a security vulnerability?

See [SECURITY.md](SECURITY.md) for our responsible disclosure process. Do not report security issues through public GitHub issues.

### Can I use ACG in commercial projects?

Yes. ACG is licensed under [Apache License 2.0](LICENSE), which permits commercial use, modification, and distribution.
