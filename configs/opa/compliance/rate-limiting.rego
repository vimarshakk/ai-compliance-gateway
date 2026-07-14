package acg.rate_limit

import rego.v1

default allow := false

allow if {
  input.rate_limit.current < input.rate_limit.max
}

deny contains msg if {
  input.rate_limit.current >= input.rate_limit.max
  msg := sprintf("Rate limit exceeded: %d/%d requests", [input.rate_limit.current, input.rate_limit.max])
}

deny contains msg if {
  input.rate_limit.tokens_used >= input.rate_limit.tokens_max
  msg := sprintf("Token limit exceeded: %d/%d tokens", [input.rate_limit.tokens_used, input.rate_limit.tokens_max])
}
