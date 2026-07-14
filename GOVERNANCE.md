# ACG Project Governance

This document describes how the ACG project is governed, how decisions are made, and how community members can contribute.

## Project Leadership

### Core Team

The ACG project is maintained by a core team of contributors who have demonstrated:
- Sustained contributions to the codebase
- Deep understanding of the architecture and goals
- Commitment to the project's success
- Ability to review and merge pull requests responsibly

### Roles

| Role | Responsibilities | How to become |
|------|-----------------|---------------|
| **Contributor** | Submit PRs, report issues, participate in discussions | Anyone who contributes |
| **Maintainer** | Review PRs, triage issues, guide architecture | Nominated by core team |
| **Core Team** | Final design decisions, release management, security | Invited by project lead |

### Current Maintainers

See [MAINTAINERS.md](MAINTAINERS.md) for the current list of maintainers.

## Decision Making

### RFC Process

Significant changes to ACG require an RFC (Request for Comments):

1. **Proposal** — Open a GitHub Discussion with the RFC
2. **Discussion** — Community discusses for at least 7 days
3. **Decision** — Core team makes a decision
4. **Implementation** — RFC is implemented and merged

### Decision Authority

| Decision Type | Authority |
|---------------|-----------|
| Bug fixes | Any maintainer |
| New features | At least 2 maintainers |
| Architecture changes | Core team consensus |
| Breaking changes | Core team + 2 week notice |
| Security fixes | Any maintainer (post-hoc review) |
| Release management | Core team |

### Consensus

We strive for consensus-based decision making. When consensus cannot be reached:
1. Core team votes (majority wins)
2. Dissenters may submit a dissenting opinion
3. The decision is documented in an ADR

## ADR Process

Architecture Decision Records (ADRs) document significant architectural decisions:

```markdown
# ADR-NNN: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
What is the issue that we're seeing that motivates this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

ADRs are stored in `docs/adr/` and tracked in `DECISIONS.md`.

## Release Process

### Release Cycle

- **Patch releases**: As needed for bug fixes and security patches
- **Minor releases**: Monthly or when significant features are ready
- **Major releases**: Annually, with 2 weeks notice

### Release Steps

1. Update CHANGELOG.md
2. Bump version numbers
3. Create release branch
4. Run full test suite
5. Security review (for major releases)
6. Tag release
7. Build and publish Docker images
8. Publish npm/PyPI packages
9. Update documentation
10. Announce release

### Version Policy

- Follow [Semantic Versioning](https://semver.org/)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Support Policy

| Version | Support Level |
|---------|--------------|
| Current major | Full support (features, bug fixes, security) |
| Previous major | Security fixes only |
| Older | No support |

### Deprecation Policy

1. Feature is marked as deprecated in CHANGELOG
2. Deprecation warning is added to documentation
3. Feature remains functional for at least 2 minor releases
4. Feature is removed in next major release

## Security Policy

See [SECURITY.md](SECURITY.md) for details on reporting and handling security vulnerabilities.

### Security Release Process

1. Vulnerability is reported privately
2. Core team assesses severity
3. Fix is developed in private
4. Fix is reviewed by at least 2 maintainers
5. CVE is assigned if applicable
6. Release is published with security advisory
7. Affected users are notified

## Community

### Communication Channels

- **GitHub Discussions**: Design, questions, and community
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat
- **Newsletter**: Monthly updates
- **Blog**: Technical deep dives and announcements

### Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). We enforce it rigorously.

### Contributor Ladder

1. **Newcomer** — First-time contributor
2. **Contributor** — 3+ merged PRs
3. **Regular Contributor** — 10+ merged PRs, active in reviews
4. **Maintainer** — Sustained contributions, trusted by core team
5. **Core Team** — Invited by project lead

### Recognition

Contributors are recognized in:
- CHANGELOG.md
- MAINTAINERS.md
- GitHub Contributors page
- Annual contributor spotlight

## License

ACG is licensed under the [Apache License 2.0](LICENSE).

### CLA

Contributors must agree to the Apache License 2.0. By submitting a PR, you confirm that your contributions are licensed under the same license.

### DCO

For compliance with open source standards, we use the Developer Certificate of Origin:

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.
```

## Commercial Entities

### Enterprise Features

Some features are reserved for enterprise customers:
- SSO/SAML integration
- Advanced governance
- Custom compliance packs
- Audit export
- Managed cloud

### Contributing Company

Companies can contribute to ACG:
- Employees can contribute during work hours
- Company is credited in MAINTAINERS.md
- Company gets logo on website (for sponsors)

## Amendments

This governance document may be amended by the core team with:
1. Proposal in GitHub Discussion
2. 7-day comment period
3. Core team approval
4. 2/3 majority vote

---

*Last updated: December 2024*
