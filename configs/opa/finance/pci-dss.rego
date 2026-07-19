package acg.finance

import rego.v1

default allow := false

allow if {
  count(deny) == 0
}

deny contains msg if {
  input.contains_pii
  msg := "Finance pack: PII detected in financial data context"
}

deny contains msg if {
  count([x | x := input.compliance_packs[_]; x == "pci-dss"]) == 0
  msg := "Finance pack requires PCI-DSS compliance pack"
}

deny contains msg if {
  contains(input.prompt, "credit card")
  contains(input.prompt, "number")
  msg := "Credit card data detected in prompt"
}

deny contains msg if {
  input.model in ["gpt-3.5-turbo"]
  msg := "Finance pack requires minimum model tier of GPT-4o-mini"
}

deny contains msg if {
  input.provider == "ollama"
  msg := "Finance pack does not allow local models for financial data"
}
