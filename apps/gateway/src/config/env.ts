export interface EnvConfig {
  GATEWAY_PORT: number;
  GATEWAY_HOST: string;
  LOG_LEVEL: string;
  CORS_ORIGIN: string[];
  LITELLM_URL: string;
  LITELLM_API_KEY: string;
  PRESIDIO_ANALYZER_URL: string;
  PRESIDIO_ANONYMIZER_URL: string;
  OPA_URL: string;
  GUARDRAILS_URL: string;
  OTEL_COLLECTOR_URL: string;
  NATS_URL: string;
  REDIS_URL: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
  BODY_LIMIT: number;
}

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined || val === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Invalid integer for ${name}: ${raw}`);
  return parsed;
}

let _config: EnvConfig | null = null;

export function loadEnv(): EnvConfig {
  if (_config) return _config;

  _config = {
    GATEWAY_PORT: optionalInt('GATEWAY_PORT', 3000),
    GATEWAY_HOST: process.env.GATEWAY_HOST ?? '0.0.0.0',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    CORS_ORIGIN: (process.env.CORS_ORIGIN ?? '*').split(','),
    LITELLM_URL: process.env.LITELLM_URL ?? 'http://litellm:4000',
    LITELLM_API_KEY: process.env.LITELLM_MASTER_KEY ?? process.env.OPENAI_API_KEY ?? '',
    PRESIDIO_ANALYZER_URL: process.env.PRESIDIO_ANALYZER_URL ?? 'http://presidio-analyzer:3000',
    PRESIDIO_ANONYMIZER_URL: process.env.PRESIDIO_ANONYMIZER_URL ?? 'http://presidio-anonymizer:3000',
    OPA_URL: process.env.OPA_URL ?? 'http://opa:8181',
    GUARDRAILS_URL: process.env.GUARDRAILS_URL ?? 'http://nemo-guardrails:8000',
    OTEL_COLLECTOR_URL: process.env.OTEL_COLLECTOR_URL ?? 'http://otel-collector:4318',
    NATS_URL: process.env.NATS_URL ?? 'nats://nats:4222',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://redis:6379',
    RATE_LIMIT_MAX: optionalInt('RATE_LIMIT_MAX', 100),
    RATE_LIMIT_WINDOW_MS: optionalInt('RATE_LIMIT_WINDOW_MS', 60000),
    BODY_LIMIT: optionalInt('BODY_LIMIT', 10 * 1024 * 1024),
  };

  return _config;
}
