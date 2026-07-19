# Versioning Policy

ACG follows [Semantic Versioning](https://semver.org/) (SemVer 2.0.0).

## Version Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — breaking changes to API, configuration, or behavior
- **MINOR** — new features, compliance packs, SDK improvements (backward-compatible)
- **PATCH** — bug fixes, security patches, documentation updates

## Current Version

The project is at **v0.1.0** (pre-1.0). During this phase:

- Minor version bumps may contain breaking changes
- All changes are documented in [CHANGELOG.md](CHANGELOG.md)
- Breaking changes are highlighted with `⚠️ BREAKING` markers

## Version Bumps

### Major (X.0.0)

- Breaking API changes
- Removed deprecated features
- Architecture redesign
- Migration guide required

### Minor (x.Y.0)

- New compliance packs
- New CLI commands
- New SDK methods
- New engine features
- Backward-compatible

### Patch (x.y.Z)

- Bug fixes
- Security patches
- Documentation updates
- Dependency updates
- Performance improvements

## Release Cadence

| Release Type | Frequency | Notification |
|-------------|-----------|--------------|
| Major | Yearly | Blog post, migration guide, email |
| Minor | Monthly | Blog post, changelog |
| Patch | As needed | Changelog, security advisory |

## Pre-release Versions

Pre-release versions use the following format:

```
MAJOR.MINOR.PATCH-alpha.N
MAJOR.MINOR.PATCH-beta.N
MAJOR.MINOR.PATCH-rc.N
```

Where `N` is the pre-release iteration number.

## Long-Term Support (LTS)

LTS versions receive security patches and critical bug fixes for **24 months** after release.

| Version | Status | End of Life |
|---------|--------|-------------|
| 2.x | Active | TBD |
| 1.x | Security fixes only | TBD |

## Dependency Versions

| Dependency | Policy |
|-----------|--------|
| Node.js | ≥ 20.0.0 |
| TypeScript | Latest stable 5.x |
| Prisma | Latest stable 5.x |
| PostgreSQL | ≥ 16 |
| Redis | ≥ 7 |
| Docker | ≥ 24.0 |

## Breaking Changes

Breaking changes require:

1. **RFC** — public discussion in GitHub Discussions
2. **Deprecation period** — minimum 2 minor releases
3. **Migration guide** — step-by-step instructions
4. **CHANGELOG entry** — marked with `⚠️ BREAKING`

## See Also

- [CHANGELOG.md](CHANGELOG.md) — release history
- [ROADMAP.md](ROADMAP.md) — upcoming features
- [RELEASE.md](RELEASE.md) — release process
