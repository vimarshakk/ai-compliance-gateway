# ACG Go SDK

Go client for the AI Compliance Gateway API.

## Installation

```bash
go get github.com/vimarshakk/ai-compliance-gateway/packages/sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    acg "github.com/vimarshakk/ai-compliance-gateway/packages/sdk-go"
)

func main() {
    client := acg.NewClient("http://localhost:3000",
        acg.WithAPIKey("acg_your_api_key_here"),
    )

    ctx := context.Background()

    // Scan a prompt
    result, err := client.Scan(ctx, "What is the meaning of life?",
        acg.WithPack("default"),
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Risk score: %.2f\n", result.RiskScore)
    fmt.Printf("Has violations: %v\n", result.HasViolations())

    // Scan with strict mode
    result, err = client.Scan(ctx, "Summarize patient records",
        acg.WithPack("hipaa"),
        acg.WithStrict(),
    )

    // Evaluate policy
    policy, err := client.EvaluatePolicy(ctx,
        "What medications is the patient taking?",
        "The patient is on Metformin 500mg twice daily.",
        "hipaa-minimum-necessary",
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Passed: %v, Score: %.2f\n", policy.Passed, policy.Score)

    // List providers
    providers, err := client.GetProviders(ctx)
    if err != nil {
        log.Fatal(err)
    }
    for _, p := range providers {
        fmt.Printf("%s: %s (score: %.2f)\n", p.Name, p.Status, p.ComplianceScore)
    }
}
```

## API Reference

### `NewClient(baseURL string, opts ...Option) *Client`

Creates a new client. Options: `WithAPIKey`, `WithHTTPClient`, `WithTimeout`.

### `client.Scan(ctx, prompt, ...ScanOption) (*ScanResult, error)`

Scans a prompt for compliance issues. Options: `WithPack`, `WithStrict`, `WithMetadata`.

### `client.EvaluatePolicy(ctx, input, output, policyID) (*PolicyResult, error)`

Evaluates output against compliance policies.

### `client.GetProviders(ctx) ([]ProviderConfig, error)`

Lists available providers and their compliance status.

### `client.GetHealth(ctx) (*HealthResponse, error)`

Checks gateway health status.

## License

Apache-2.0
