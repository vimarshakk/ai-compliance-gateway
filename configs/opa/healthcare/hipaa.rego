package acg.healthcare

import rego.v1

default allow := false

allow if {
  count(deny) == 0
}

deny contains msg if {
  input.contains_pii
  msg := "Healthcare pack: PII detected - must be redacted before processing"
}

deny contains msg if {
  count([x | x := input.compliance_packs[_]; x == "hipaa"]) == 0
  msg := "Healthcare pack requires HIPAA compliance pack to be enabled"
}

deny contains msg if {
  contains(input.prompt, "diagnosis")
  contains(input.prompt, "treat")
  msg := "Clinical advice requests require additional authorization"
}

deny contains msg if {
  input.model in ["gpt-3.5-turbo", "gpt-4o-mini"]
  msg := "Healthcare pack requires minimum model tier of GPT-4o"
}

deny contains msg if {
  input.provider == "ollama"
  msg := "Healthcare pack does not allow local models for PHI processing"
}
