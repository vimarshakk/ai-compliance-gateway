# ADR-005: Docker Compose Profiles for Incremental Adoption

## Status
Accepted

## Context
Not every deployment needs all 41 upstream services. Development might only need core services. Enterprise features are optional. AI-native services are progressive enhancements.

## Decision
Use Docker Compose profiles to group services:
- `core` — Gateway, Admin, LiteLLM, OPA, Presidio, NeMo Guardrails, PostgreSQL, Redis, NATS, Keycloak, Vault, Kong, Qdrant, MinIO
- `enterprise` — Istio, Cilium, cert-manager, Trivy, Falco, Cosign, Kyverno, SpiceDB, ClickHouse, MLflow
- `observability` — Prometheus, Grafana, OTel Collector
- `ai-native` — OpenLIT, Langfuse, Open WebUI, KServe, Ray
- `local-llm` — Ollama, vLLM
- `development` — All core services with relaxed settings

## Consequences
### Positive
- Start small, add services as needed
- Lower resource requirements for development
- Clear separation of service tiers
- Easy to upgrade between tiers

### Negative
- Profile interactions can be complex
- Some services depend on others across profiles
