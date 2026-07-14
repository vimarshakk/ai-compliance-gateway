# Release Process

This document describes how ACG releases are created and published.

## Release Workflow

### 1. Prepare Release

```bash
# Ensure all tests pass
pnpm test
pnpm lint
pnpm typecheck

# Build all packages
pnpm build

# Verify Docker builds
docker compose build
```

### 2. Update Version

```bash
# Update root package.json version
npm version <patch|minor|major> --no-git-tag-version

# Update CHANGELOG.md with release notes
# Add new section at the top
```

### 3. Create Release Branch

```bash
git checkout -b release/v0.2.0
git add .
git commit -m "chore: prepare release v0.2.0"
```

### 4. Tag Release

```bash
git tag v0.2.0
git push origin v0.2.0
```

### 5. Automated Release

Pushing a tag triggers the release workflow:

1. **Build** — all packages compiled
2. **Test** — full test suite runs
3. **Docker** — multi-platform images built and pushed to GHCR
4. **Release** — GitHub Release created with notes
5. **SBOM** — Software Bill of Materials generated

### 6. Publish Packages

```bash
# Publish TypeScript SDK
cd packages/sdk-typescript
npm publish --access public

# Publish CLI
cd packages/cli
npm publish --access public
```

## Release Checklist

### Pre-release

- [ ] All tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] TypeCheck passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Docker builds succeed (`docker compose build`)
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json files
- [ ] Documentation updated

### Release

- [ ] Git tag created (`v0.x.0`)
- [ ] GitHub Release created
- [ ] Docker images pushed to GHCR
- [ ] SBOM generated
- [ ] Packages published to npm
- [ ] Release notes reviewed

### Post-release

- [ ] Announce in GitHub Discussions
- [ ] Update documentation site
- [ ] Verify deployment works
- [ ] Monitor for issues

## Docker Images

Docker images are published to GitHub Container Registry (GHCR):

| Image | Tag Format |
|-------|-----------|
| `ghcr.io/mprudhvi145-bit/ai-compliance-gateway/gateway` | `v0.x.0`, `latest` |
| `ghcr.io/mprudhvi145-bit/ai-compliance-gateway/admin` | `v0.x.0`, `latest` |
| `ghcr.io/mprudhvi145-bit/ai-compliance-gateway/dashboard` | `v0.x.0`, `latest` |
| `ghcr.io/mprudhvi145-bit/ai-compliance-gateway/evaluator` | `v0.x.0`, `latest` |

### Multi-platform Builds

Docker images are built for:

- `linux/amd64`
- `linux/arm64`

## npm Packages

| Package | Registry |
|---------|----------|
| `@acg/cli` | npm |
| `@acg/sdk` | npm |
| `@acg/kernel` | npm (internal) |

## Security

### Container Signing

All Docker images are signed with cosign:

```bash
cosign verify ghcr.io/mprudhvi145-bit/ai-compliance-gateway/gateway:v0.2.0
```

### SBOM

Software Bill of Materials is generated for each release:

```bash
cosign verify-attestation --type spdxjson \
  ghcr.io/mprudhvi145-bit/ai-compliance-gateway/gateway:v0.2.0
```

## Hotfixes

For critical security patches:

1. Create branch from latest release tag
2. Apply fix
3. Bump patch version
4. Tag and push
5. Merge back to main

```bash
git checkout v0.2.0
git checkout -b hotfix/v0.2.1
# ... apply fix ...
npm version patch --no-git-tag-version
git tag v0.2.1
git push origin v0.2.1
```

## Deprecation Policy

When a feature is deprecated:

1. **Announce** in CHANGELOG.md with `⚠️ DEPRECATED` marker
2. **Document** migration path
3. **Maintain** for at least 2 minor versions
4. **Remove** in next major version

## See Also

- [VERSIONING.md](VERSIONING.md) — versioning policy
- [CHANGELOG.md](CHANGELOG.md) — release history
- [SECURITY.md](SECURITY.md) — security policy
