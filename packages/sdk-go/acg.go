// Package acg provides a Go client for the AI Compliance Gateway API.
package acg

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is the ACG API client.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// Option configures the client.
type Option func(*Client)

// WithAPIKey sets the API key for authentication.
func WithAPIKey(key string) Option {
	return func(c *Client) { c.apiKey = key }
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) { c.httpClient = hc }
}

// WithTimeout sets the request timeout.
func WithTimeout(d time.Duration) Option {
	return func(c *Client) { c.httpClient.Timeout = d }
}

// NewClient creates a new ACG client.
func NewClient(baseURL string, opts ...Option) *Client {
	c := &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// ScanResult represents the result of a prompt scan.
type ScanResult struct {
	RiskScore      float64     `json:"risk_score"`
	Violations     []Violation `json:"violations"`
	Recommendations []string   `json:"recommendations"`
	Pack           string      `json:"pack"`
	ScanID         string      `json:"scan_id,omitempty"`
	DurationMs     float64     `json:"duration_ms,omitempty"`
}

// HasViolations returns true if any violations were found.
func (r *ScanResult) HasViolations() bool {
	return len(r.Violations) > 0
}

// CriticalCount returns the number of critical violations.
func (r *ScanResult) CriticalCount() int {
	count := 0
	for _, v := range r.Violations {
		if v.Severity == "critical" {
			count++
		}
	}
	return count
}

// Violation represents a single compliance violation.
type Violation struct {
	RuleID     string  `json:"rule_id"`
	Severity   string  `json:"severity"`
	Message    string  `json:"message"`
	Category   string  `json:"category"`
	Line       *int    `json:"line,omitempty"`
	Column     *int    `json:"column,omitempty"`
	Suggestion *string `json:"suggestion,omitempty"`
}

// PolicyResult represents the result of a policy evaluation.
type PolicyResult struct {
	Passed        bool        `json:"passed"`
	Score         float64     `json:"score"`
	Violations    []Violation `json:"violations"`
	PolicyID      string      `json:"policy_id,omitempty"`
	EvaluationID  string      `json:"evaluation_id,omitempty"`
}

// ProviderConfig represents a provider configuration.
type ProviderConfig struct {
	Name             string   `json:"name"`
	Status           string   `json:"status"`
	ComplianceScore  float64  `json:"compliance_score"`
	Models           []string `json:"models"`
	Region           string   `json:"region,omitempty"`
}

// ScanRequest is the request body for the scan endpoint.
type ScanRequest struct {
	Prompt   string            `json:"prompt"`
	Pack     string            `json:"pack,omitempty"`
	Strict   bool              `json:"strict,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// ProvidersResponse is the response from the providers endpoint.
type ProvidersResponse struct {
	Providers []ProviderConfig `json:"providers"`
}

// HealthResponse is the response from the health endpoint.
type HealthResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version,omitempty"`
	Uptime    string `json:"uptime,omitempty"`
}

// scan sends a scan request.
func (c *Client) scan(ctx context.Context, body interface{}) (*ScanResult, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	var result ScanResult
	if err := c.do(ctx, http.MethodPost, "/v1/scan", data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Scan scans a prompt for compliance issues.
func (c *Client) Scan(ctx context.Context, prompt string, opts ...ScanOption) (*ScanResult, error) {
	cfg := scanConfig{pack: "default"}
	for _, opt := range opts {
		opt(&cfg)
	}
	return c.scan(ctx, ScanRequest{
		Prompt:   prompt,
		Pack:     cfg.pack,
		Strict:   cfg.strict,
		Metadata: cfg.metadata,
	})
}

// ScanOption configures a scan request.
type ScanOption func(*scanConfig)

type scanConfig struct {
	pack     string
	strict   bool
	metadata map[string]string
}

// WithPack sets the compliance pack.
func WithPack(pack string) ScanOption {
	return func(c *scanConfig) { c.pack = pack }
}

// WithStrict enables strict mode.
func WithStrict() ScanOption {
	return func(c *scanConfig) { c.strict = true }
}

// WithMetadata adds metadata to the scan.
func WithMetadata(md map[string]string) ScanOption {
	return func(c *scanConfig) { c.metadata = md }
}

// EvaluatePolicy evaluates output against compliance policies.
func (c *Client) EvaluatePolicy(ctx context.Context, input, output string, policyID string) (*PolicyResult, error) {
	body := map[string]string{
		"input":  input,
		"output": output,
	}
	if policyID != "" {
		body["policyId"] = policyID
	}
	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	var result PolicyResult
	if err := c.do(ctx, http.MethodPost, "/v1/policy/evaluate", data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetProviders lists available providers.
func (c *Client) GetProviders(ctx context.Context) ([]ProviderConfig, error) {
	var result ProvidersResponse
	if err := c.do(ctx, http.MethodGet, "/v1/providers", nil, &result); err != nil {
		return nil, err
	}
	return result.Providers, nil
}

// GetHealth checks gateway health.
func (c *Client) GetHealth(ctx context.Context) (*HealthResponse, error) {
	var result HealthResponse
	if err := c.do(ctx, http.MethodGet, "/health", nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// do executes an HTTP request and decodes the response.
func (c *Client) do(ctx context.Context, method, path string, body []byte, result interface{}) error {
	url := c.baseURL + path
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}
	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}
	}
	return nil
}
