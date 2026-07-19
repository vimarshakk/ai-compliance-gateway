package acg.routing

import rego.v1

default route_provider := "openai"

route_provider := "anthropic" if {
  input.model == "claude-sonnet-4-20250514"
}

route_provider := "ollama" if {
  input.provider == "ollama"
}

route_provider := "vllm" if {
  input.provider == "vllm"
}

deny contains msg if {
  input.provider == "openai"
  not input.api_key_valid
  msg := "OpenAI API key is invalid or expired"
}

deny contains msg if {
  input.provider == "anthropic"
  not input.api_key_valid
  msg := "Anthropic API key is invalid or expired"
}
