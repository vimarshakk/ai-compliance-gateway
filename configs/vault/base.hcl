storage "raft" {
  path = "/vault/data"
  node_id = "acg-vault"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = 1
}

ui = true
api_addr = "http://0.0.0.0:8200"

seal "shamir" {
  shares = 1
  threshold = 1
}
