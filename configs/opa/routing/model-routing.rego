package acg.routing

import rego.v1

default route_provider = "openai"

route_provider = "anthropic" {
  input.model == "claude-sonnet-4-20250514"
}

route_provider = "ollama" {
  input.provider == "ollama"
}

route_provider = "vllm" {
  input.provider == "vllm"
}

deny[msg] {
  input.provider == "openai"
  not input.api_key_valid
  msg := "OpenAI API key is invalid or expired"
}

deny[msg] {
  input.provider == "anthropic"
  not input.api_key_valid
  msg := "Anthropic API key is invalid or expired"
}
