package acg.rbac

import rego.v1

default allow := false

allow if {
  input.user.role == "admin"
}

allow if {
  input.user.role == "developer"
  input.action in ["read", "create"]
}

allow if {
  input.user.role == "viewer"
  input.action == "read"
}

allow if {
  input.user.role == "auditor"
  input.action in ["read", "audit"]
}

deny contains msg if {
  input.user.role == "viewer"
  input.action in ["create", "update", "delete"]
  msg := sprintf("Viewer role cannot perform %s action", [input.action])
}
