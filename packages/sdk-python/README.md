# ACG Python SDK

Python client for the AI Compliance Gateway API.

## Installation

```bash
pip install acg
```

## Quick Start

```python
from acg import ACGClient

client = ACGClient(
    base_url="http://localhost:3000",
    api_key="acg_your_api_key_here"
)

# Scan a prompt for compliance
result = client.scan("What is the meaning of life?", pack="default")
print(f"Risk score: {result.risk_score}")
print(f"Violations: {len(result.violations)}")

if result.has_violations:
    for v in result.violations:
        print(f"  [{v.severity}] {v.message}")

# Scan through a specific provider
result = client.scan_with_provider(
    "Summarize patient records",
    provider="openai",
    model="gpt-4",
    pack="hipaa"
)

# Evaluate policy
policy = client.evaluate_policy(
    input_text="What medications is the patient taking?",
    output_text="The patient is on Metformin 500mg twice daily.",
    policy_id="hipaa-minimum-necessary"
)
print(f"Passed: {policy.passed}, Score: {policy.score}")

# List providers
providers = client.get_providers()
for p in providers:
    print(f"{p.name}: {p.status} (score: {p.compliance_score})")

# Context manager
with ACGClient(base_url="http://localhost:3000") as client:
    result = client.scan("test prompt")
```

## API Reference

### `ACGClient(base_url, api_key, timeout)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `base_url` | `str` | `http://localhost:3000` | Gateway URL |
| `api_key` | `str \| None` | `None` | API key for authentication |
| `timeout` | `float` | `30.0` | Request timeout in seconds |

### `client.scan(prompt, pack, strict, metadata)`

Scans a prompt for compliance issues.

Returns `ScanResult` with `risk_score`, `violations`, and `recommendations`.

### `client.scan_with_provider(prompt, provider, model, pack)`

Scans a prompt and routes through a specific provider.

### `client.evaluate_policy(input_text, output_text, policy_id)`

Evaluates model output against compliance policies.

Returns `PolicyResult` with `passed`, `score`, and `violations`.

### `client.get_providers()`

Lists available providers and their compliance status.

### `client.get_health()`

Checks gateway health status.

## License

Apache-2.0
