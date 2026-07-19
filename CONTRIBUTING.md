# Contributing to ACG

Thank you for your interest in contributing to ACG! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+

### Development Setup

```bash
# Clone the repository
git clone https://github.com/acg-ai/acg.git
cd acg

# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d postgres redis nats keycloak opa

# Run database migrations
pnpm --filter @acg/database db:migrate

# Start development servers
pnpm dev

# Run tests
pnpm test
```

### Project Structure

```
acg/
├── apps/            # Applications (gateway, admin, dashboard)
├── packages/        # Shared packages (26 packages)
├── infra/           # Infrastructure (helm, kubernetes, docker)
├── docs/            # Documentation
├── examples/        # Sample applications
└── tests/           # Integration tests
```

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/acg-ai/acg/issues) first
2. Use the [Bug Report template](https://github.com/acg-ai/acg/issues/new?template=bug_report.md)
3. Include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details
   - Logs/screenshots if applicable

### Suggesting Features

1. Check [existing discussions](https://github.com/acg-ai/acg/discussions) first
2. Use the [Feature Request template](https://github.com/acg-ai/acg/issues/new?template=feature_request.md)
3. Include:
   - Problem statement
   - Proposed solution
   - Alternatives considered
   - Use cases
   - Compliance impact (if any)

### Submitting Changes

#### Branch Naming

```
feat/description     # New features
fix/description      # Bug fixes
docs/description     # Documentation
refactor/description # Code refactoring
test/description     # Tests
chore/description    # Maintenance
```

#### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(gateway): add rate limiting per API key

- Implement sliding window rate limiter
- Add rate limit headers to responses
- Update configuration schema

Closes #123
```

#### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes
4. **Add** tests for new functionality
5. **Update** documentation if needed
6. **Run** the full test suite:
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```
7. **Submit** a pull request

#### PR Requirements

- [ ] Tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] TypeScript checks pass (`pnpm typecheck`)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG entry added
- [ ] Commit messages follow Conventional Commits

#### PR Review Process

1. **Automated checks** must pass
2. **At least 1** maintainer approval required
3. **Security review** required for security-related changes
4. **Compliance review** required for compliance-related changes

### Code Style

#### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable data
- Avoid `any` — use `unknown` if type is truly unknown
- Use descriptive variable names
- Keep functions small and focused

#### Formatting

- Use Prettier with default settings
- Line length: 100 characters
- Single quotes for strings
- Trailing commas in multiline structures
- Semicolons always

#### Imports

```typescript
// External imports first
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

// Internal imports
import { Config } from '@acg/shared';
import { validateApiKey } from './utils.js';
```

### Testing

#### Unit Tests

- Test one thing per test
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for 95%+ coverage

#### Integration Tests

- Test real interactions
- Use test containers for databases
- Clean up after tests
- Test error scenarios

#### E2E Tests

- Test complete workflows
- Use realistic data
- Test edge cases
- Verify compliance outcomes

### Documentation

- Document all public APIs
- Include code examples
- Update README for new features
- Add ADRs for architectural decisions
- Keep docs up to date

## Development Guidelines

### Adding a New Engine

1. Create package in `packages/`
2. Implement `Engine` interface
3. Add engine metadata
4. Write comprehensive tests
5. Add integration with kernel
6. Document in ARCHITECTURE.md

### Adding a Compliance Pack

1. Create pack in `packages/enterprise-packs/`
2. Define rules in Rego
3. Add compliance framework metadata
4. Write tests for each rule
5. Document compliance mapping
6. Add to marketplace registry

### Adding a Connector

1. Create connector in `packages/connectors/`
2. Implement provider interface
3. Add configuration schema
4. Write tests
5. Document configuration
6. Add to provider registry

## Getting Help

- **Discussions**: [GitHub Discussions](https://github.com/acg-ai/acg/discussions)
- **Issues**: [GitHub Issues](https://github.com/acg-ai/acg/issues)
- **Discord**: [Join our Discord](https://discord.gg/acg)
- **Email**: [pvimarshak@gmail.com](mailto:pvimarshak@gmail.com)

## Recognition

Contributors are recognized in:

- **CHANGELOG.md** — for each release
- **MAINTAINERS.md** — for core contributors
- **GitHub Contributors page** — automatic
- **Release notes** — for significant contributions

## License

By contributing to ACG, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
