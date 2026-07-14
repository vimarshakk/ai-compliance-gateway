package acg.india

import rego.v1

default allow := false

allow if {
  count(deny) == 0
}

deny contains msg if {
  input.contains_pii
  msg := "India compliance pack: PII detected - must comply with DPDP Act"
}

deny contains msg if {
  count([x | x := input.compliance_packs[_]; x == "dpdp"]) == 0
  msg := "India pack requires DPDP compliance pack"
}

deny contains msg if {
  contains(input.prompt, "Aadhaar")
  msg := "Aadhaar number detected - restricted under UIDAI guidelines"
}

deny contains msg if {
  contains(input.prompt, "PAN")
  not contains(input.prompt, "pan-")
  msg := "Potential PAN number detected - restricted under IT Act"
}

deny contains msg if {
  input.provider == "ollama"
  msg := "India pack: Local models require additional approval for data residency"
}
