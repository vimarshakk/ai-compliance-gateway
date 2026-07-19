# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentation site scaffold (Mintlify)
- SDK packages (TypeScript, Python, Go)
- Helm chart for Kubernetes deployment
- GitHub Actions CI/CD hardening
- ADR process and initial ADRs

### Changed
- Rebuilt the Git history using the enterprise conventional-commit strategy.
  - 417 tracked files replayed as **154 granular commits** across **76 feature branches**.
  - Branch topology: `main` (production) ← `release/m1` ← `develop` ← `feature/m1-*`.
  - All merges use `--no-ff` merge commits (no squashing) to preserve feature lineage.
  - Tagged `v0.1.0` (Milestone 1 release) and `m1` (milestone marker) on `main`.
  - Default branch is `main`; `develop` and `release/m1` are pushed to `origin`.

## [2.6.0] - 2024-12-XX

### Added
- Marketplace package (`@acg/marketplace`) — pack registry, install/publish
- Enterprise Packs (`@acg/enterprise-packs`) — 6 packs with 41 real rules:
  - HIPAA (8 rules, §164.x sections)
  - PCI-DSS (6 rules, Req 3-10)
  - SOC 2 (6 rules, CC/A/PI criteria)
  - ABDM (7 rules, ABHA/FHIR/localization)
  - AI Safety (8 rules, bias/toxicity/hallucination)
  - Banking/RBI (6 rules, KYC/AML/digital lending)
- Community Plugins (`@acg/community-plugins`) — manifest validation, sandbox config, 6 community plugins
- Governance package (`@acg/governance`) — RBAC (5 roles with inheritance), AuditTrail, SSO stub, OrganizationManager
- Admin API marketplace routes (packs, plugins, RBAC, audit)
- CLI `packs` command with `install`, `uninstall`, `search` subcommands

## [2.5.0] - 2024-11-XX

### Added
- VS Code extension — real-time scanning with diagnostics, status bar, 8 commands
- GitHub Action — composite action + workflow for CI/CD compliance scanning
- MCP Server (`@acg/mcp-server`) — 7 tools for AI coding assistants
- CLI `config` command — persistent `~/.acg/config.json` with show/set/get/init

## [2.4.0] - 2024-10-XX

### Added
- Billing & Subscription Management (`@acg/billing`) — Stripe integration, plan enforcement
- Gateway plan enforcement middleware — subscription quota checking before LLM requests
- Admin subscription routes — CRUD + usage tracking

## [2.3.0] - 2024-09-XX

### Added
- Platform Kernel (`@acg/kernel`) — 5 components:
  - Plugin Runtime — lifecycle hooks, sandboxing
  - Rule Engine — OPA/Rego, JavaScript, Python rules
  - Registry — plugin discovery, version resolution
  - Asset Graph Engine — AI-BOM generation
  - Evidence Engine — audit trail, chain integrity
  - Compliance Score Engine — per-org scoring, history
- Expanded gateway routes (kernel stats, asset graph, evidence)
- Expanded CLI commands (providers, packs, kernel subcommands)

## [2.2.0] - 2024-08-XX

### Added
- Compliance Score Engine — per-organization scoring with history
- BOM Adapter — AI component discovery
- Expanded gateway routes for compliance and providers
- Expanded CLI commands for compliance packs

## [2.1.0] - 2024-07-XX

### Added
- API Key authentication (X-Api-Key header, PostgreSQL-backed)
- SSE streaming for `/chat/completions`
- Event bus (NATS-based, 50+ event types)
- Swagger/OpenAPI documentation
- CLI with 11 commands, hybrid mode (local + remote)
- CI/CD pipeline (GitHub Actions)
- Docker hardening (dumb-init, non-root, HEALTHCHECK)

## [2.0.0] - 2024-06-XX

### Added
- Complete rewrite as monorepo
- Gateway (Fastify, OPA, NeMo Guardrails)
- Admin API (Fastify, Prisma, 30+ endpoints)
- Dashboard (Next.js 15, React 19)
- 26 packages across engines, SDKs, and tools
- 300+ tests
- PostgreSQL schema (10 models)
- Docker Compose stack (10 services)

## [1.0.0] - 2024-01-XX

### Added
- Initial release
- Basic compliance scanning
- Single AI provider support

[Unreleased]: https://github.com/acg-ai/acg/compare/v2.6.0...HEAD
[2.6.0]: https://github.com/acg-ai/acg/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/acg-ai/acg/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/acg-ai/acg/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/acg-ai/acg/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/acg-ai/acg/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/acg-ai/acg/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/acg-ai/acg/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/acg-ai/acg/releases/tag/v1.0.0
