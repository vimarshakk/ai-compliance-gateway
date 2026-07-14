package acg.india

import rego.v1

default allow = false

allow {
  count(deny) == 0
}

deny[msg] {
  input.contains_pii
  msg := "India compliance pack: PII detected - must comply with DPDP Act"
}

deny[msg] {
  not contains(input.compliance_packs, "dpdp")
  msg := "India pack requires DPDP compliance pack"
}

deny[msg] {
  input.prompt contains "Aadhaar"
  msg := "Aadhaar number detected - restricted under UIDAI guidelines"
}

deny[msg] {
  input.prompt contains "PAN"
  not input.prompt contains "pan-"
  msg := "Potential PAN number detected - restricted under IT Act"
}

deny[msg] {
  input.provider == "ollama"
  msg := "India pack: Local models require additional approval for data residency"
}

contains(arr, val) {
  arr[_] == val
}
