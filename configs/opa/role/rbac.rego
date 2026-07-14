package acg.rbac

import rego.v1

default allow = false

allow {
  input.user.role == "admin"
}

allow {
  input.user.role == "developer"
  input.action in ["read", "create"]
}

allow {
  input.user.role == "viewer"
  input.action == "read"
}

allow {
  input.user.role == "auditor"
  input.action in ["read", "audit"]
}

deny[msg] {
  input.user.role == "viewer"
  input.action in ["create", "update", "delete"]
  msg := sprintf("Viewer role cannot perform %s action", [input.action])
}
