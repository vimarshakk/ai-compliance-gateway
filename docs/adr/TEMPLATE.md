# ADR Template

Use this template when creating a new ADR.

```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD

**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-XXX](XXX.md)

**Deciders:** List of people involved in the decision

## Context

What is the issue that we're seeing that motivates this decision? What is the force that is pushing us toward a particular decision?

## Decision

What is the change that we're proposing and/or doing? Be specific and actionable.

## Consequences

### Positive

- What becomes easier or more pleasant to do because of this change?

### Negative

- What becomes harder or less pleasant to do because of this change?

### Risks

- What are the risks of this decision? How can they be mitigated?

## Alternatives Considered

What other options were evaluated? Why were they rejected?

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Option A | ... | ... | ... |
| Option B | ... | ... | ... |

## References

- Links to relevant documents, issues, or discussions

## Review

This ADR should be reviewed:
- When the decision is reconsidered
- When the context changes significantly
- When new alternatives become available
```

## Naming Convention

ADRs are numbered sequentially: `000-use-opa-for-policy.md`, `001-prefer-nats-over-kafka.md`, etc.

## Lifecycle

1. **Proposed** — Under discussion
2. **Accepted** — Decision made and implemented
3. **Deprecated** — No longer relevant
4. **Superseded** — Replaced by a newer ADR
