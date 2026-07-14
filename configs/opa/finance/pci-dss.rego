package acg.finance

import rego.v1

default allow = false

allow {
  count(deny) == 0
}

deny[msg] {
  input.contains_pii
  msg := "Finance pack: PII detected in financial data context"
}

deny[msg] {
  not contains(input.compliance_packs, "pci-dss")
  msg := "Finance pack requires PCI-DSS compliance pack"
}

deny[msg] {
  contains(input.prompt, "credit card")
  contains(input.prompt, "number")
  msg := "Credit card data detected in prompt"
}

deny[msg] {
  input.model in ["gpt-3.5-turbo"]
  msg := "Finance pack requires minimum model tier of GPT-4o-mini"
}

deny[msg] {
  input.provider == "ollama"
  msg := "Finance pack does not allow local models for financial data"
}

contains(arr, val) {
  arr[_] == val
}
