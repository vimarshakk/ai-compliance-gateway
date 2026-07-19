# Maintainers

This document lists the current maintainers of the ACG project and their areas of responsibility.

## Core Team

| Name | Role | Areas | GitHub |
|---|---|---|---|
| — | Project Lead | Architecture, Strategy | — |

## Areas of Responsibility

### Gateway
- Core proxy and request handling
- API key authentication
- Rate limiting
- Provider routing

### Kernel
- Platform Kernel components
- Plugin system
- Pipeline runner

### Compliance
- Policy engine (OPA)
- Compliance packs
- Rego rules
- Evidence collection

### Dashboard
- React UI components
- Charts and visualizations
- User experience

### CLI
- Command-line interface
- Configuration management
- Developer experience

### Documentation
- API reference
- Guides and tutorials
- Examples

### DevOps
- Docker configuration
- Kubernetes manifests
- CI/CD pipelines
- Monitoring

## Becoming a Maintainer

See [GOVERNANCE.md](./GOVERNANCE.md) for the process of becoming a maintainer.

## Responsibilities

Maintainers are expected to:

1. **Review PRs** within 5 business days
2. **Respond to issues** within 2 business days
3. **Maintain expertise** in their area
4. **Mentor contributors** working in their area
5. **Ensure quality** of code and documentation
6. **Follow the roadmap** and prioritize accordingly

## Decision Making

- **Minor changes** (docs, tests, deps): Any maintainer can approve
- **Moderate changes** (features, refactors): 1 maintainer approval
- **Major changes** (architecture, breaking): 2 maintainer approvals + RFC
- **Security fixes**: Any maintainer can merge immediately

## On-Call

Maintainers rotate on-call responsibilities for:
- Security vulnerability response
- Production incident response
- Release coordination

## Contact

- **Security issues**: See [SECURITY.md](./SECURITY.md)
- **General questions**: GitHub Discussions
- **Private matters**: pvimarshak@gmail.com
