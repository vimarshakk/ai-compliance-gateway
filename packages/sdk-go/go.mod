// Package acg provides a Go client for the AI Compliance Gateway API.
//
// Usage:
//
//	client := acg.NewClient("http://localhost:3000", acg.WithAPIKey("acg_..."))
//	result, err := client.Scan(ctx, "What is the meaning of life?")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Printf("Risk score: %.2f\n", result.RiskScore)
//	fmt.Printf("Violations: %d\n", len(result.Violations))
module github.com/vimarshakk/ai-compliance-gateway/packages/sdk-go

go 1.22

require github.com/stretchr/testify v1.9.0

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/stretchr/objx v0.5.2 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
