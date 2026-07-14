# Supported AI Providers

ACG supports any OpenAI-compatible API endpoint via LiteLLM, plus native integrations for major providers.

## Provider Matrix

### OpenAI

| Model | Streaming | Function Calling | Vision | Compliance |
|-------|-----------|-----------------|--------|------------|
| GPT-4o | ✅ | ✅ | ✅ | High |
| GPT-4o-mini | ✅ | ✅ | ✅ | High |
| GPT-4-turbo | ✅ | ✅ | ✅ | High |
| GPT-3.5-turbo | ✅ | ✅ | ❌ | Medium |

**Configuration:**
```env
OPENAI_API_KEY=sk-...
```

### Anthropic

| Model | Streaming | Function Calling | Vision | Compliance |
|-------|-----------|-----------------|--------|------------|
| Claude 3.5 Sonnet | ✅ | ✅ | ✅ | High |
| Claude 3 Opus | ✅ | ✅ | ✅ | High |
| Claude 3 Haiku | ✅ | ✅ | ❌ | Medium |

**Configuration:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Azure OpenAI

| Model | Streaming | Function Calling | Vision | Compliance |
|-------|-----------|-----------------|--------|------------|
| GPT-4 | ✅ | ✅ | ✅ | Enterprise |
| GPT-4-turbo | ✅ | ✅ | ✅ | Enterprise |
| GPT-35-turbo | ✅ | ✅ | ❌ | Enterprise |

**Configuration:**
```env
AZURE_API_KEY=...
AZURE_API_BASE=https://your-resource.openai.azure.com
AZURE_API_VERSION=2024-02-01
```

### AWS Bedrock

| Model | Streaming | Function Calling | Vision | Compliance |
|-------|-----------|-----------------|--------|------------|
| Claude 3.5 Sonnet | ✅ | ✅ | ✅ | Enterprise |
| Claude 3 Opus | ✅ | ✅ | ✅ | Enterprise |
| Llama 3.1 70B | ✅ | ❌ | ❌ | Medium |

**Configuration:**
```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Google Vertex AI

| Model | Streaming | Function Calling | Vision | Compliance |
|-------|-----------|-----------------|--------|------------|
| Gemini 1.5 Pro | ✅ | ✅ | ✅ | Enterprise |
| Gemini 1.5 Flash | ✅ | ✅ | ✅ | High |
| Gemini 1.0 Pro | ✅ | ❌ | ❌ | Medium |

**Configuration:**
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
GOOGLE_PROJECT_ID=your-project
```

### Local Models

| Provider | Models | Streaming | Compliance |
|----------|--------|-----------|------------|
| Ollama | Llama 3, Mistral, Phi-3 | ✅ | Self-hosted |
| vLLM | Any HuggingFace model | ✅ | Self-hosted |

**Configuration:**
```env
OLLAMA_BASE_URL=http://localhost:11434
```

## Compliance Scoring

Each provider receives a compliance score based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Data residency | 25% | Where data is processed and stored |
| Encryption | 25% | At-rest and in-transit encryption |
| Access controls | 20% | Authentication and authorization |
| Audit logging | 15% | Request/response logging |
| Certifications | 15% | SOC2, ISO27001, HIPAA compliance |

### Provider Scores

| Provider | Score | Tier |
|----------|-------|------|
| Azure OpenAI | 95/100 | Enterprise |
| AWS Bedrock | 93/100 | Enterprise |
| Google Vertex AI | 91/100 | Enterprise |
| OpenAI | 85/100 | High |
| Anthropic | 83/100 | High |
| Local (Ollama) | 100/100 | Self-hosted |

## Routing Configuration

```yaml
# configs/ai-router.yaml
providers:
  - name: openai
    priority: 1
    compliance:
      minScore: 80
    cost:
      maxPerToken: 0.00003
    latency:
      maxP95: 2000

  - name: anthropic
    priority: 2
    compliance:
      minScore: 80
    cost:
      maxPerToken: 0.000015
    latency:
      maxP95: 3000

  - name: azure
    priority: 3
    compliance:
      minScore: 90
    cost:
      maxPerToken: 0.00004
    latency:
      maxP95: 2500
```

## Adding Custom Providers

Any OpenAI-compatible endpoint can be added:

```yaml
providers:
  - name: my-custom-provider
    baseUrl: https://api.my-provider.com/v1
    apiKey: ${MY_PROVIDER_API_KEY}
    models:
      - my-model-7b
      - my-model-13b
```

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — AI Router architecture
- [docs/providers/](docs/providers/) — provider configuration guides
