package acg

import rego.v1

default allow := false

allow if {
  count(deny) == 0
}

deny contains msg if {
  input.contains_pii
  not input.pii_redacted
  msg := "PII detected but not redacted — Presidio unavailable or bypassed"
}

deny contains msg if {
  input.model == "gpt-4"
  not input.organization_id
  msg := "GPT-4 requires authenticated organization"
}

deny contains msg if {
  contains(input.prompt, "ignore previous instructions")
  msg := "Prompt injection detected"
}

deny contains msg if {
  contains(input.prompt, "system prompt")
  contains(input.prompt, "reveal")
  msg := "Potential system prompt extraction"
}
