# ADR-009: Workflows Package for Orchestration

## Status
Accepted

## Context
The gateway service needs to orchestrate multiple connectors in a specific order (PII detection → policy evaluation → firewall check → model call → output filtering). This orchestration logic should be reusable and testable independently.

## Decision
Extract orchestration into `packages/workflows/` with:
- `Workflow` base class with step execution and event publishing
- `PromptWorkflow` — Main AI request flow
- `ModerationWorkflow` — Content moderation flow
- `RoutingWorkflow` — Model routing flow
- `EvaluationWorkflow` — Model evaluation flow

Each workflow:
- Takes input, runs through steps, produces output
- Publishes events to NATS at each step
- Can be tested in isolation with mock connectors

## Consequences
### Positive
- Gateway becomes a thin HTTP layer (just route → workflow → response)
- Workflows are testable without HTTP overhead
- New workflows can be added without touching gateway code
- Event publishing is built into the workflow base class

### Negative
- Additional abstraction layer
- Must ensure workflow state is thread-safe
