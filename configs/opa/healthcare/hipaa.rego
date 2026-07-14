package acg.healthcare

import rego.v1

default allow = false

allow {
  count(deny) == 0
}

deny[msg] {
  input.contains_pii
  msg := "Healthcare pack: PII detected - must be redacted before processing"
}

deny[msg] {
  not contains(input.compliance_packs, "hipaa")
  msg := "Healthcare pack requires HIPAA compliance pack to be enabled"
}

deny[msg] {
  contains(input.prompt, "diagnosis")
  contains(input.prompt, "treat")
  msg := "Clinical advice requests require additional authorization"
}

deny[msg] {
  input.model in ["gpt-3.5-turbo", "gpt-4o-mini"]
  msg := "Healthcare pack requires minimum model tier of GPT-4o"
}

deny[msg] {
  input.provider == "ollama"
  msg := "Healthcare pack does not allow local models for PHI processing"
}

contains(arr, val) {
  arr[_] == val
}
