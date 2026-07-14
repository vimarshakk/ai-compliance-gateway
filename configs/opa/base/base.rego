package acg

default allow = false

# Allow if no deny rules match
allow {
  count(deny) == 0
}

deny[msg] {
  input.contains_pii
  msg := "PII detected in prompt - blocked by default policy"
}

deny[msg] {
  input.model == "gpt-4"
  not input.organization_id
  msg := "GPT-4 requires authenticated organization"
}

deny[msg] {
  input.prompt contains "ignore previous instructions"
  msg := "Prompt injection detected"
}

deny[msg] {
  input.prompt contains "system prompt"
  input.prompt contains "reveal"
  msg := "Potential system prompt extraction"
}
