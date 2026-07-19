/**
 * AI Compliance Gateway — Go Quickstart
 *
 * This example demonstrates:
 * 1. Chat completion with compliance checks
 * 2. Content moderation
 * 3. Health checking
 *
 * Prerequisites:
 *   - ACG Gateway running (docker compose up)
 *   - An API key (from dashboard or CLI)
 *   - Go 1.22+
 *
 * Run:
 *   go run src/main.go
 */

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

var (
	gatewayURL = getEnv("GATEWAY_URL", "http://localhost:3000")
	adminURL   = getEnv("ADMIN_URL", "http://localhost:3002")
	apiKey     = getEnv("ACG_API_KEY", "dev-key")
	orgID      = getEnv("ACG_ORG_ID", "my-org")
	projectID  = getEnv("ACG_PROJECT_ID", "my-project")
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func headers() map[string]string {
	return map[string]string{
		"Content-Type":  "application/json",
		"X-Api-Key":    apiKey,
	}
}

// ─── Health Check ───────────────────────────────────────

func checkHealth() error {
	fmt.Println("--- Health Check ---")
	client := &http.Client{Timeout: 5 * time.Second}
	req, _ := http.NewRequest("GET", gatewayURL+"/health", nil)
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("gateway unreachable: %w\nStart with: docker compose up", err)
	}
	defer res.Body.Close()

	var health map[string]interface{}
	json.NewDecoder(res.Body).Decode(&health)
	fmt.Printf("Gateway healthy: %v\n", health["status"] == "healthy")
	return nil
}

// ─── Chat Completion ────────────────────────────────────

func chatCompletion(messages []map[string]string, compliancePack string) error {
	fmt.Printf("\n--- Chat Completion (%s pack) ---\n", compliancePack)

	body := map[string]interface{}{
		"model":              "gpt-4o-mini",
		"messages":           messages,
		"organizationId":     orgID,
		"projectId":         projectID,
		"piiDetectionEnabled": true,
	}
	if compliancePack != "" {
		body["compliancePack"] = compliancePack
	}

	data, _ := json.Marshal(body)
	client := &http.Client{Timeout: 60 * time.Second}
	req, _ := http.NewRequest("POST", gatewayURL+"/chat/completions", bytes.NewReader(data))
	for k, v := range headers() {
		req.Header.Set(k, v)
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(res.Body)
		return fmt.Errorf("error %d: %s", res.StatusCode, string(bodyBytes))
	}

	var result map[string]interface{}
	json.NewDecoder(res.Body).Decode(&result)

	fmt.Printf("Model: %v\n", result["model"])
	fmt.Printf("Provider: %v\n", result["provider"])

	if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]interface{}); ok {
			if msg, ok := choice["message"].(map[string]interface{}); ok {
				fmt.Printf("Response: %v\n", msg["content"])
			}
		}
	}

	if usage, ok := result["usage"].(map[string]interface{}); ok {
		fmt.Printf("Tokens: %v\n", usage["totalTokens"])
	}
	if cost, ok := result["cost"].(map[string]interface{}); ok {
		fmt.Printf("Cost: %v %v\n", cost["totalCost"], cost["currency"])
	}
	if decisions, ok := result["policyDecisions"].([]interface{}); ok {
		fmt.Printf("Policy decisions: %d\n", len(decisions))
	}
	if latency, ok := result["latencyMs"].(float64); ok {
		fmt.Printf("Latency: %dms\n", int64(latency))
	}

	return nil
}

// ─── Moderation ─────────────────────────────────────────

func moderate(text string) error {
	fmt.Println("\n--- Content Moderation ---")

	body := map[string]interface{}{
		"text":          text,
		"organizationId": orgID,
		"contentTypes":  []string{"pii", "profanity", "toxicity"},
	}

	data, _ := json.Marshal(body)
	client := &http.Client{Timeout: 30 * time.Second}
	req, _ := http.NewRequest("POST", gatewayURL+"/moderations", bytes.NewReader(data))
	for k, v := range headers() {
		req.Header.Set(k, v)
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(res.Body)
		return fmt.Errorf("error %d: %s", res.StatusCode, string(bodyBytes))
	}

	var result map[string]interface{}
	json.NewDecoder(res.Body).Decode(&result)

	fmt.Printf("Result: %v\n", result["moderationResult"])
	fmt.Printf("Risk level: %v\n", result["riskLevel"])
	fmt.Printf("Reasons: %v\n", result["reasons"])
	if latency, ok := result["latencyMs"].(float64); ok {
		fmt.Printf("Latency: %dms\n", int64(latency))
	}

	return nil
}

// ─── Engine Status ──────────────────────────────────────

func engineStatus() error {
	fmt.Println("\n--- Engine Status ---")
	client := &http.Client{Timeout: 10 * time.Second}

	// Providers
	req, _ := http.NewRequest("GET", adminURL+"/engines/router/providers", nil)
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	var providers map[string]interface{}
	json.NewDecoder(res.Body).Decode(&providers)
	fmt.Printf("Router: %v providers\n", providers["total"])

	// Packs
	req2, _ := http.NewRequest("GET", adminURL+"/engines/compliance/packs", nil)
	res2, err := client.Do(req2)
	if err != nil {
		return err
	}
	defer res2.Body.Close()
	var packs map[string]interface{}
	json.NewDecoder(res2.Body).Decode(&packs)
	fmt.Printf("Compliance: %v packs\n", packs["total"])

	return nil
}

// ─── Main ───────────────────────────────────────────────

func main() {
	fmt.Println("AI Compliance Gateway — Go Example\n")

	if err := checkHealth(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if err := chatCompletion(
		[]map[string]string{
			{"role": "system", "content": "You are a helpful healthcare assistant."},
			{"role": "user", "content": "What are the symptoms of diabetes?"},
		},
		"hipaa",
	); err != nil {
		fmt.Fprintf(os.Stderr, "Chat error: %v\n", err)
	}

	if err := chatCompletion(
		[]map[string]string{
			{"role": "user", "content": "Explain data localization requirements in India."},
		},
		"dpdp",
	); err != nil {
		fmt.Fprintf(os.Stderr, "Chat error: %v\n", err)
	}

	if err := moderate("This is a sample message for content moderation testing."); err != nil {
		fmt.Fprintf(os.Stderr, "Moderation error: %v\n", err)
	}

	if err := engineStatus(); err != nil {
		fmt.Fprintf(os.Stderr, "Engine status error: %v\n", err)
	}

	fmt.Println("\nDone.")
}
