# AI Compliance Gateway - Makefile
# Comprehensive development, build, test, and deployment targets

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ─── Configuration ───────────────────────────────────────────────
NODE_VERSION := 22
PNPM_VERSION := 9
PYTHON_VERSION := 3.12
GO_VERSION := 1.22
IMAGE_REGISTRY := ghcr.io
IMAGE_ORG := mprudhvi145-bit
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# ─── Help ────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────────────────────────
.PHONY: dev
dev: ## Start full development stack
	docker compose --profile development up -d
	@echo ""
	@echo "  Gateway:   http://localhost:3000"
	@echo "  Admin:     http://localhost:3002"
	@echo "  Dashboard: http://localhost:3004"
	@echo "  Grafana:   http://localhost:3005"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  Keycloak:  http://localhost:8080"
	@echo "  Vault:     http://localhost:8200"
	@echo ""

.PHONY: dev-down
dev-down: ## Stop development stack
	docker compose --profile development down -v

.PHONY: dev-restart
dev-restart: dev-down dev ## Restart development stack

# ─── Build ───────────────────────────────────────────────────────
.PHONY: build
build: ## Build all packages
	pnpm install --frozen-lockfile
	pnpm build

.PHONY: build-docker
build-docker: ## Build all Docker images
	docker compose build

.PHONY: build-docker-gateway
build-docker-gateway: ## Build gateway Docker image
	docker build -t $(IMAGE_REGISTRY)/$(IMAGE_ORG)/ai-compliance-gateway/gateway:$(VERSION) \
		-f deployments/docker/Dockerfile.gateway .

.PHONY: build-docker-multi
build-docker-multi: ## Build multi-platform Docker images
	@for service in gateway admin dashboard evaluator playground; do \
		echo "Building $$service..."; \
		docker buildx build \
			--platform linux/amd64,linux/arm64 \
			-t $(IMAGE_REGISTRY)/$(IMAGE_ORG)/ai-compliance-gateway/$$service:$(VERSION) \
			-f deployments/docker/Dockerfile.$$service . \
			--push; \
	done

# ─── Lint & Typecheck ───────────────────────────────────────────
.PHONY: lint
lint: ## Run linting across all packages
	pnpm -r run lint

.PHONY: lint-fix
lint-fix: ## Run linting with auto-fix
	pnpm -r run lint -- --fix

.PHONY: typecheck
typecheck: ## Run type checking across all packages
	pnpm -r run typecheck

.PHONY: format
format: ## Format all code
	pnpm prettier --write .

.PHONY: format-check
format-check: ## Check code formatting
	pnpm prettier --check .

# ─── Test ────────────────────────────────────────────────────────
.PHONY: test
test: ## Run all tests
	pnpm vitest run

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	pnpm vitest

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	pnpm vitest run --coverage

.PHONY: test-ui
test-ui: ## Open Vitest UI
	pnpm vitest --ui

.PHONY: test-integration
test-integration: ## Run integration tests (requires services)
	pnpm vitest run --config vitest.integration.config.ts

# ─── SDK - Python ───────────────────────────────────────────────
.PHONY: sdk-python-install
sdk-python-install: ## Install Python SDK dev dependencies
	cd packages/sdk-python && pip install -e ".[dev]"

.PHONY: sdk-python-lint
sdk-python-lint: ## Lint Python SDK
	cd packages/sdk-python && ruff check .

.PHONY: sdk-python-test
sdk-python-test: ## Test Python SDK
	cd packages/sdk-python && pytest

.PHONY: sdk-python-build
sdk-python-build: ## Build Python SDK package
	cd packages/sdk-python && python -m build

# ─── SDK - Go ───────────────────────────────────────────────────
.PHONY: sdk-go-test
sdk-go-test: ## Test Go SDK
	cd packages/sdk-go && go test -v ./...

.PHONY: sdk-go-vet
sdk-go-vet: ## Vet Go SDK
	cd packages/sdk-go && go vet ./...

# ─── SDK - TypeScript ────────────────────────────────────────────
.PHONY: sdk-ts-build
sdk-ts-build: ## Build TypeScript SDK
	cd packages/sdk-typescript && pnpm build

.PHONY: sdk-ts-test
sdk-ts-test: ## Test TypeScript SDK
	cd packages/sdk-typescript && pnpm test

# ─── Helm ────────────────────────────────────────────────────────
.PHONY: helm-lint
helm-lint: ## Lint Helm chart
	helm lint infra/helm/acg

.PHONY: helm-template
helm-template: ## Template Helm chart (dry-run)
	helm template acg infra/helm/acg --dry-run

.PHONY: helm-install
helm-install: ## Install Helm chart to current cluster
	helm install acg infra/helm/acg --namespace acg --create-namespace

.PHONY: helm-upgrade
helm-upgrade: ## Upgrade Helm chart
	helm upgrade acg infra/helm/acg --namespace acg

.PHONY: helm-uninstall
helm-uninstall: ## Uninstall Helm chart
	helm uninstall acg --namespace acg

# ─── Docker ──────────────────────────────────────────────────────
.PHONY: up
up: ## Start core production stack
	docker compose --profile core --profile observability up -d

.PHONY: down
down: ## Stop all services
	docker compose down -v

.PHONY: logs
logs: ## Tail all service logs
	docker compose logs -f

.PHONY: logs-gateway
logs-gateway: ## Tail gateway logs
	docker compose logs -f gateway

.PHONY: logs-admin
logs-admin: ## Tail admin logs
	docker compose logs -f admin

.PHONY: ps
ps: ## Show running containers
	docker compose ps

.PHONY: clean
clean: ## Stop all services and prune Docker resources
	docker compose down -v --remove-orphans
	docker system prune -f

# ─── Database ────────────────────────────────────────────────────
.PHONY: db-migrate
db-migrate: ## Run database migrations
	pnpm prisma migrate deploy

.PHONY: db-push
db-push: ## Push database schema changes
	pnpm prisma db push

.PHONY: db-seed
db-seed: ## Seed the database
	pnpm prisma db seed

.PHONY: db-studio
db-studio: ## Open Prisma Studio
	pnpm prisma studio

.PHONY: db-reset
db-reset: ## Reset database (WARNING: destroys data)
	pnpm prisma migrate reset --force

.PHONY: db-status
db-status: ## Show migration status
	pnpm prisma migrate status

# ─── Security ────────────────────────────────────────────────────
.PHONY: audit
audit: ## Run dependency security audit
	pnpm audit

.PHONY: audit-fix
audit-fix: ## Fix dependency vulnerabilities
	pnpm audit --fix

.PHONY: trivy
trivy: ## Run Trivy container scan
	trivy image $(IMAGE_REGISTRY)/$(IMAGE_ORG)/ai-compliance-gateway/gateway:$(VERSION)

.PHONY: sbom
sbom: ## Generate SBOM
	syft dir:. -o spdx-json=sbom.spdx.json

# ─── Release ─────────────────────────────────────────────────────
.PHONY: version
version: ## Show current version
	@echo "$(VERSION)"

.PHONY: release-dry
release-dry: ## Dry-run release (validate without publishing)
	pnpm build
	pnpm test
	pnpm lint
	helm lint infra/helm/acg
	@echo "✅ Dry-run passed. Ready to tag."

.PHONY: tag
tag: ## Create a version tag (usage: make tag V=0.2.0)
	@if [ -z "$(V)" ]; then echo "Usage: make tag V=0.2.0"; exit 1; fi
	git tag -a v$(V) -m "Release v$(V)"
	git push origin v$(V)
	@echo "Tagged v$(V) — CI will handle the release."

# ─── Utilities ───────────────────────────────────────────────────
.PHONY: clean-all
clean-all: clean ## Deep clean (Docker + node_modules + build artifacts)
	rm -rf node_modules packages/*/node_modules apps/*/node_modules
	rm -rf apps/*/dist packages/*/dist .turbo coverage
	@echo "✅ Deep clean complete"

.PHONY: install
install: ## Install all dependencies
	pnpm install --frozen-lockfile

.PHONY: changeset
changeset: ## Create a changeset
	pnpm changeset

.PHONY: changeset-version
changeset-version: ## Apply changesets and bump versions
	pnpm changeset version

.PHONY: changeset-publish
changeset-publish: ## Publish packages with changesets
	pnpm changeset publish
