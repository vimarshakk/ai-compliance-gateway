package acg

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewClient(t *testing.T) {
	c := NewClient("http://localhost:3000")
	assert.Equal(t, "http://localhost:3000", c.baseURL)
	assert.Equal(t, "", c.apiKey)
}

func TestNewClientWithOptions(t *testing.T) {
	c := NewClient("http://localhost:3000",
		WithAPIKey("test-key"),
		WithTimeout(5000),
	)
	assert.Equal(t, "test-key", c.apiKey)
}

func TestScan(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/scan", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "Bearer test-key", r.Header.Get("Authorization"))

		var req ScanRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		require.NoError(t, err)
		assert.Equal(t, "test prompt", req.Prompt)
		assert.Equal(t, "default", req.Pack)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScanResult{
			RiskScore:  0.2,
			Violations: []Violation{},
			Pack:       "default",
		})
	}))
	defer server.Close()

	c := NewClient(server.URL, WithAPIKey("test-key"))
	result, err := c.Scan(context.Background(), "test prompt")

	require.NoError(t, err)
	assert.Equal(t, 0.2, result.RiskScore)
	assert.False(t, result.HasViolations())
}

func TestScanWithPack(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req ScanRequest
		json.NewDecoder(r.Body).Decode(&req)

		assert.Equal(t, "hipaa", req.Pack)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ScanResult{
			RiskScore: 0.8,
			Violations: []Violation{
				{RuleID: "hipaa-001", Severity: "critical", Message: "PHI detected"},
			},
			Pack: "hipaa",
		})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	result, err := c.Scan(context.Background(), "patient has diabetes", WithPack("hipaa"))

	require.NoError(t, err)
	assert.Equal(t, 0.8, result.RiskScore)
	assert.True(t, result.HasViolations())
	assert.Equal(t, 1, result.CriticalCount())
}

func TestEvaluatePolicy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/policy/evaluate", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(PolicyResult{
			Passed: true,
			Score:  0.95,
		})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	result, err := c.EvaluatePolicy(context.Background(), "input", "output", "")

	require.NoError(t, err)
	assert.True(t, result.Passed)
	assert.Equal(t, 0.95, result.Score)
}

func TestGetProviders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/providers", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ProvidersResponse{
			Providers: []ProviderConfig{
				{Name: "openai", Status: "healthy", ComplianceScore: 0.92},
				{Name: "anthropic", Status: "healthy", ComplianceScore: 0.95},
			},
		})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	providers, err := c.GetProviders(context.Background())

	require.NoError(t, err)
	assert.Len(t, providers, 2)
	assert.Equal(t, "openai", providers[0].Name)
}

func TestGetHealth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/health", r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(HealthResponse{
			Status: "healthy",
		})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	health, err := c.GetHealth(context.Background())

	require.NoError(t, err)
	assert.Equal(t, "healthy", health.Status)
}

func TestAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "internal server error"}`))
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Scan(context.Background(), "test")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "500")
}
