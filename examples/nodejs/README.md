# AI Compliance Gateway — Node.js Example

## Quick Start

```bash
# 1. Start ACG (from repo root)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Set environment variables
export GATEWAY_URL=http://localhost:3000
export ADMIN_URL=http://localhost:3002
export ACG_API_KEY=your-api-key

# 4. Run
npm start
```

## What It Demonstrates

| Feature | Description |
|---------|-------------|
| Health Check | Verify gateway is running |
| HIPAA Chat | Chat completion with HIPAA compliance pack |
| DPDP Chat | Chat completion with Indian data protection pack |
| Content Moderation | PII, profanity, toxicity detection |
| Engine Status | List router providers and compliance packs |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_URL` | `http://localhost:3000` | Gateway URL |
| `ADMIN_URL` | `http://localhost:3002` | Admin API URL |
| `ACG_API_KEY` | `dev-key` | Your API key |
| `ACG_ORG_ID` | `my-org` | Organization ID |
| `ACG_PROJECT_ID` | `my-project` | Project ID |
