# ADR-010: Evaluator Service for Model Comparison

## Status
Accepted

## Context
Organizations need to evaluate different AI models for accuracy, cost, latency, and compliance before choosing which model to use in production.

## Decision
Create `apps/evaluator/` as a separate service that:
- Runs prompt evaluations across multiple models
- Scores outputs for hallucination, accuracy, and compliance
- Tracks cost and latency metrics
- Integrates with MLflow and Langfuse for experiment tracking
- Provides cost analysis API for model comparison

## Consequences
### Positive
- Dedicated service for evaluation workloads (which are different from real-time inference)
- Can run long evaluations without blocking the gateway
- Integrates with MLflow for experiment tracking
- Provides data-driven model selection

### Negative
- Additional service to deploy and maintain
- Evaluation results may not perfectly predict production behavior
