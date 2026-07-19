export interface Connector {
  readonly name: string;
  readonly baseUrl: string;
  healthCheck(): Promise<boolean>;
}

export interface LLMConnector extends Connector {
  complete(params: {
    model: string;
    messages: Array<{ role: string; content: string | null }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }): Promise<{
    id: string;
    choices: Array<{ index: number; message: { role: string; content: string }; finish_reason: string | null }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    model: string;
  }>;
}

export interface PIIDetectorConnector extends Connector {
  analyze(params: { text: string; language?: string; entities?: string[]; scoreThreshold?: number }): Promise<Array<{
    entity_type: string;
    start: number;
    end: number;
    score: number;
    text: string;
  }>>;
}

export interface PIIAnonymizerConnector extends Connector {
  anonymize(params: { text: string; analyzer_results: Array<{ entity_type: string; start: number; end: number; score: number }>; operator: string }): Promise<{ text: string }>;
}

export interface PolicyEngineConnector extends Connector {
  evaluate(params: { input: Record<string, unknown> }): Promise<{ result: unknown }>;
  putPolicy(params: { path: string; policy: string }): Promise<void>;
}

export interface GuardrailsConnector extends Connector {
  check(params: { messages: Array<{ role: string; content: string }> }): Promise<{
    response: { role: string; content: string };
    rails_output: Record<string, unknown>;
  }>;
}

export interface AuthConnector extends Connector {
  getRealm(params: { realm: string }): Promise<Record<string, unknown>>;
  validateToken(params: { token: string; realm: string }): Promise<{ valid: boolean; sub: string; realm_access?: Record<string, unknown> }>;
}

export interface SecretsConnector extends Connector {
  getSecret(params: { path: string }): Promise<{ data: Record<string, unknown> }>;
  putSecret(params: { path: string; data: Record<string, unknown> }): Promise<void>;
}

export interface TelemetryConnector extends Connector {
  exportTraces(params: { resourceSpans: unknown[] }): Promise<void>;
  exportMetrics(params: { resourceMetrics: unknown[] }): Promise<void>;
}

export interface CacheConnector extends Connector {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface EventBusConnector extends Connector {
  publish(subject: string, data: unknown): Promise<void>;
  subscribe(subject: string, handler: (data: unknown) => void): Promise<void>;
}

export interface StorageConnector extends Connector {
  putObject(params: { bucket: string; key: string; body: Buffer; contentType: string }): Promise<string>;
  getObject(params: { bucket: string; key: string }): Promise<Buffer | null>;
  listObjects(params: { bucket: string; prefix?: string }): Promise<string[]>;
}

export interface MetricsConnector extends Connector {
  query(params: { promql: string; start: string; end: string; step: string }): Promise<unknown>;
}

export interface UsageMeterConnector extends Connector {
  reportUsage(params: { subject: string; event: string; quantity: number; timestamp: string }): Promise<void>;
}

export interface VectorDBConnector extends Connector {
  upsert(params: { collection: string; vectors: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> }): Promise<void>;
  search(params: { collection: string; vector: number[]; limit: number; filter?: Record<string, unknown> }): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>>;
}
