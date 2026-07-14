<p align="center">
  <img src="docs/images/acg-logo.svg" width="120" alt="ACG Logo">
</p>

<h1 align="center">AI Compliance Gateway</h1>

<p align="center">
  <strong>The open-source AI governance & compliance platform for regulated industries.</strong><br>
  Scan, monitor, and enforce compliance across every AI interaction — HIPAA, GDPR, DPDP, PCI-DSS, SOC2, ABDM, and more.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="https://github.com/vimarshakk/ai-compliance-gateway/tree/main/docs">Documentation</a> •
  <a href="#features">Features</a> •
  <a href="#compliance-packs">Compliance Packs</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#community">Community</a> •
  <a href="https://github.com/vimarshakk/ai-compliance-gateway/releases">Releases</a>
</p>

<p align="center">
  <a href="https://github.com/vimarshakk/ai-compliance-gateway/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://github.com/vimarshakk/ai-compliance-gateway/releases"><img src="https://img.shields.io/badge/Release-v0.1.0-brightgreen.svg" alt="Release"></a>
  <a href="https://github.com/vimarshakk/ai-compliance-gateway/actions"><img src="https://img.shields.io/badge/CI-Passing-brightgreen.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Coverage-95%25-brightgreen" alt="Coverage">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/26-Packages-6B7280" alt="Packages">
  <img src="https://img.shields.io/badge/300%2B-Tests-10B981" alt="Tests">
  <img src="https://img.shields.io/badge/41-Enterprise%20Rules-F59E0B" alt="Rules">
  <img src="https://img.shields.io/badge/8-Compliance%20Packs-8B5CF6" alt="Packs">
  <img src="https://img.shields.io/badge/OpenAPI-3.1-6BA539" alt="OpenAPI">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED" alt="Docker">
  <img src="https://img.shields.io/badge/Multi--Provider%20AI-6366f1" alt="Multi-Provider">
  <img src="https://img.shields.io/badge/SSE%20Streaming-10B981" alt="SSE">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node-%E2%89%A520-339933" alt="Node">
</p>

---

## What is ACG?

ACG (AI Compliance Gateway) is a **Cloudflare for Enterprise AI** — a policy engine and compliance platform that sits between your applications and AI providers, enforcing regulations in real time.

**The problem:** Enterprise teams adopting AI face a wall of regulations — HIPAA for healthcare, GDPR for EU data, DPDP for India, PCI-DSS for payments. Non-compliance means fines, lawsuits, and reputational damage. Existing tools are either too narrow (single-regulation) or too broad (generic audit tools that don't understand AI).

**The solution:** ACG intercepts every AI request and response, applies compliance policies in real time, generates audit evidence, and produces compliance scores — all while routing to the best AI provider for each use case.

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Your App    │────▶│  ACG Gateway    │────▶│  AI Provider │
│              │     │                 │     │  (OpenAI,    │
│  (API call)  │     │  • Policy check │     │   Anthropic, │
│              │◀────│  • Risk scoring │◀────│   Azure, ...)│
│              │     │  • Audit trail  │     │              │
└──────────────┘     │  • Evidence     │     └──────────────┘
                     └─────────────────┘
                              │
                     ┌─────────────────┐
                     │  Admin Dashboard │
                     │  (Compliance,   │
                     │   Scores, BOM,  │
                     │   Providers)    │
                     └─────────────────┘
```

## Features

<table>
<tr>
<td width="50%">

### Core Engine
- **Real-time policy enforcement** — OPA/Rego + JavaScript + Python rules
- **AI Router** — smart routing across providers with fallback
- **Risk Engine** — continuous risk scoring with ML-ready signals
- **Compliance Engine** — regulatory rule evaluation and evidence generation
- **Governance Engine** — organizational controls and audit trails
- **SSE streaming** — full streaming support for `/chat/completions`

</td>
<td width="50%">

### Enterprise
- **AI-BOM** — AI Bill of Materials (models, datasets, tools, dependencies)
- **Compliance Scores** — per-organization, per-project scoring with history
- **Provider Certification** — compliance feature matrix for AI providers
- **Marketplace** — install/publish compliance packs and plugins
- **RBAC** — 5 roles with inheritance (owner → viewer)
- **Audit Trail** — every action logged with full context

</td>
</tr>
<tr>
<td>

### Compliance Packs
- 🇮🇳 **DPDP** — India Data Protection & Digital Privacy
- 🇺🇸 **HIPAA** — Health Insurance Portability & Accountability
- 🇪🇺 **GDPR** — General Data Protection Regulation
- 💳 **PCI-DSS** — Payment Card Industry Data Security
- 🏢 **SOC 2** — Service Organization Control
- 🏥 **ABDM** — Ayushman Bharat Digital Mission
- 🤖 **AI Safety** — Bias, toxicity, hallucination detection
- 🏦 **Banking** — RBI banking regulations

</td>
<td>

### Developer Surfaces
- **CLI** — `acg scan`, `acg score`, `acg bom`, `acg doctor`
- **MCP Server** — 7 tools for Claude, Cursor, and AI coding tools
- **VS Code Extension** — real-time compliance diagnostics
- **GitHub Action** — CI/CD compliance scanning
- **SDKs** — TypeScript, Python, Go
- **REST API** — OpenAPI-documented, versioned

</td>
</tr>
</table>

## Quick Start

### 5 Minutes to Your First Scan

```bash
# Install the CLI
npm install -g @acg/cli

# Scan your project
acg scan .

# Check compliance score
acg score .

# Generate AI Bill of Materials
acg bom .
```

### With Docker Compose

```bash
git clone https://github.com/vimarshakk/ai-compliance-gateway.git
cd ai-compliance-gateway

# Start all services (gateway + admin + database)
docker compose up -d

# Verify
acg doctor

# Scan a project
acg scan . --remote
```

### With Your App (3 lines)

```typescript
import { ACGClient } from '@acg/sdk';

const client = new ACGClient({
  gatewayUrl: 'http://localhost:3000',
  adminUrl: 'http://localhost:3002',
  apiKey: 'your-key',
});

// Chat with compliance enforcement
const response = await client.chatCompletion({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Summarize patient records...' }],
  compliancePack: 'hipaa',
});
```

### SDKs

| Language | Package | Install |
|----------|---------|---------|
| TypeScript | `@acg/sdk` | `npm install @acg/sdk` |
| Python | `acg` | `pip install acg` |
| Go | `github.com/vimarshakk/ai-compliance-gateway-go` | `go get github.com/vimarshakk/ai-compliance-gateway-go` |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ACG Platform                         │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Gateway  │  │  Admin   │  │Dashboard │  │ CLI    │ │
│  │ :3000    │  │  :3002   │  │  :3004   │  │        │ │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────────┘ │
│       │              │                                  │
│  ┌────▼──────────────▼──────────────────────────────┐  │
│  │                  Kernel                           │  │
│  │  ┌────────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │Plugin      │ │Rule      │ │Registry        │  │  │
│  │  │Runtime     │ │Engine    │ │                │  │  │
│  │  └────────────┘ └──────────┘ └────────────────┘  │  │
│  │  ┌────────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │Asset Graph │ │Evidence  │ │Compliance Score│  │  │
│  │  │Engine      │ │Engine    │ │Engine          │  │  │
│  │  └────────────┘ └──────────┘ └────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Engine Layer                         │  │
│  │  AI Router │ Risk │ Governance │ Compliance      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Infrastructure                       │  │
│  │  PostgreSQL │ Redis │ NATS │ Keycloak │ OPA      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Design Principles:**
- **Orchestration over reimplementing** — ACG orchestrates upstream OSS (OPA, NeMo Guardrails, etc.) via HTTP/gRPC, never reimplements their logic
- **Plugin architecture** — every component is a loadable plugin with lifecycle hooks
- **Event-driven** — 50+ event types via NATS for extensibility
- **Fail-closed** — when upstream services are unreachable, ACG denies requests (never silently allows)
- **Evidence chain** — every decision produces a cryptographically chained audit entry

## Compliance Packs

| Pack | Framework | Rules | Key Areas |
|------|-----------|-------|-----------|
| `dpdp` | India DPDP Act 2023 | Consent, data localization, purpose limitation | Indian enterprises |
| `hipaa` | HIPAA §164 | PHI detection, audit trails, encryption, de-identification | Healthcare AI |
| `gdpr` | GDPR Art. 22-25 | Automated decisions, DPIA, data subject rights | EU operations |
| `pci-dss` | PCI-DSS Req 1-12 | PAN detection, CVV prohibition, encryption, segmentation | Payment AI |
| `soc2` | SOC 2 CC/A1/PI | Access control, change management, incident response | SaaS/AI |
| `abdm` | ABDM Guidelines | ABHA verification, consent, FHIR R4, data residency | Indian healthcare |
| `ai-safety` | AI Safety Principles | Bias, toxicity, hallucination, explainability, red-team | All AI |
| `banking` | RBI Regulations | KYC/AML, fair practices, data localization, digital lending | Indian banking |

## Comparison

| Feature | ACG | Guardrails AI | NeMo Guardrails | OPA | Custom |
|---------|-----|---------------|-----------------|-----|--------|
| **Real-time enforcement** | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| **Multi-provider routing** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Compliance packs** | 8 built-in | ❌ | ❌ | ❌ | ❌ |
| **AI-BOM generation** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Compliance scoring** | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| **Audit evidence chain** | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| **Plugin marketplace** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **VS Code extension** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **GitHub Action** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MCP Server** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Enterprise RBAC** | ✅ | ❌ | ❌ | ✅ | ⚠️ |

## Repository Structure

```
ai-compliance-gateway/
├── apps/
│   ├── admin/              # Admin API (Fastify, Prisma, 30+ endpoints)
│   ├── gateway/            # AI Gateway (Fastify, OPA, streaming)
│   ├── dashboard/          # Web Dashboard (Next.js, React 19)
│   ├── evaluator/          # Model evaluation service
│   └── playground/         # Interactive compliance playground
├── packages/
│   ├── kernel/             # Platform Kernel (plugin runtime, rule engine, registry)
│   ├── billing/            # Subscription & usage management
│   ├── marketplace/        # Pack registry & marketplace
│   ├── governance/         # RBAC, audit trail, SSO, org management
│   ├── enterprise-packs/   # HIPAA, PCI-DSS, SOC2, ABDM, AI Safety, Banking
│   ├── community-plugins/  # Plugin manifest, validation, sandbox
│   ├── cli/                # CLI (11 commands, 29+ tests)
│   ├── mcp-server/         # MCP Server (7 tools for AI coding assistants)
│   ├── vscode/             # VS Code extension (real-time scanning)
│   ├── sdk-typescript/     # TypeScript SDK
│   ├── contracts/          # API contracts & OpenAPI spec
│   ├── database/           # Prisma schema (10 models)
│   ├── shared/             # Shared types & utilities
│   ├── connectors/         # Upstream integrations
│   ├── ai-router/          # Smart provider routing
│   ├── risk-engine/        # Risk scoring engine
│   ├── governance-engine/  # Governance rules engine
│   ├── compliance-engine/  # Compliance rules engine
│   └── workflows/          # Prompt workflow orchestration
├── infra/
│   ├── helm/               # Helm charts
│   ├── kubernetes/         # K8s manifests
│   └── terraform/          # Terraform modules
├── deployments/
│   └── docker/             # Dockerfiles for all services
├── docs/                   # Documentation site (Mintlify)
├── examples/               # Sample apps (Node.js, Python, Go)
├── tests/                  # Integration tests
├── policies/               # OPA/Rego policies
├── configs/                # Service configurations
├── scripts/                # Build & deployment scripts
├── seeds/                  # Database seed data
├── .github/                # GitHub configuration
├── docker-compose.yml      # Full stack (30+ services)
├── turbo.json              # Monorepo build pipeline
└── Makefile                # Quick commands
```

## Deploy

### Docker Compose (Recommended for getting started)

```bash
docker compose up -d
# Gateway:   http://localhost:3000
# Admin:     http://localhost:3002
# Dashboard: http://localhost:3004
# Playground: http://localhost:3006
```

### Kubernetes

```bash
helm install acg ./infra/helm/acg \
  --set gateway.apiKey=$API_KEY \
  --set admin.postgresUrl=$DATABASE_URL
```

### Cloud

```bash
# Coming soon: acg.cloud (managed offering)
```

## Community

- 📖 [Documentation](https://github.com/vimarshakk/ai-compliance-gateway/tree/main/docs)
- 💬 [GitHub Discussions](https://github.com/vimarshakk/ai-compliance-gateway/discussions)
- 🏗️ [Roadmap](ROADMAP.md)
- 🤝 [Contributing](CONTRIBUTING.md)
- 📋 [Governance](GOVERNANCE.md)
- 📧 [Security](SECURITY.md)

## Security

ACG takes security seriously. If you discover a vulnerability, please follow our [Security Policy](SECURITY.md). Do not report security issues through public GitHub issues.

All releases are signed. Verify with:

```bash
cosign verify ghcr.io/vimarshakk/ai-compliance-gateway:latest
```

## License

ACG is licensed under the [Apache License 2.0](LICENSE).

The core engine is fully open source. Enterprise features (SSO/SAML, advanced governance, managed cloud) are available in [ACG Enterprise](https://acg.dev/enterprise).

---

<p align="center">
  Built with care for the teams building AI that the world can trust.<br>
  <a href="https://www.linkedin.com/in/prudhvi-vimarshak-3aaa23166/" target="_blank" rel="noopener noreferrer">By Vimarshak</a>
</p>
