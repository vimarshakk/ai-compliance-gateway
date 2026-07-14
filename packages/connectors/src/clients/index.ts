import { BaseConnector } from './base.js';
import type { AuthConnector, SecretsConnector, TelemetryConnector, CacheConnector, EventBusConnector, StorageConnector, MetricsConnector, UsageMeterConnector, VectorDBConnector } from '../interfaces/index.js';

export class KeycloakConnector extends BaseConnector implements AuthConnector {
  private realmCache = new Map<string, { data: unknown; expiresAt: number }>();

  constructor(baseUrl: string) {
    super('keycloak', baseUrl);
  }

  async getRealm(params: { realm: string }) {
    const cached = this.realmCache.get(params.realm);
    if (cached && cached.expiresAt > Date.now()) return cached.data as Record<string, unknown>;
    const data = await this.request<Record<string, unknown>>('GET', `/realms/${params.realm}`);
    this.realmCache.set(params.realm, { data, expiresAt: Date.now() + 300000 });
    return data;
  }

  async validateToken(params: { token: string; realm: string }) {
    try {
      const res = await fetch(`${this.baseUrl}/realms/${params.realm}/protocol/openid-connect/userinfo`, {
        headers: { Authorization: `Bearer ${params.token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { valid: false, sub: '' };
      const data = await res.json() as { sub: string; realm_access?: { roles: string[] } };
      return { valid: true, sub: data.sub, realm_access: data.realm_access };
    } catch {
      return { valid: false, sub: '' };
    }
  }
}

export class VaultConnector extends BaseConnector implements SecretsConnector {
  private token: string;

  constructor(baseUrl: string, token: string) {
    super('vault', baseUrl);
    this.token = token;
  }

  async getSecret(params: { path: string }) {
    return this.request<{ data: Record<string, unknown> }>('GET', `/v1/${params.path}`, undefined, { 'X-Vault-Token': this.token });
  }

  async putSecret(params: { path: string; data: Record<string, unknown> }) {
    await this.request<unknown>('POST', `/v1/${params.path}`, { data: params.data }, { 'X-Vault-Token': this.token });
  }

  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/v1/sys/health`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export class OTelCollectorConnector extends BaseConnector implements TelemetryConnector {
  constructor(baseUrl: string) {
    super('otel-collector', baseUrl, 10000);
  }

  async exportTraces(params: { resourceSpans: unknown[] }) {
    await this.request<unknown>('POST', '/v1/traces', { resourceSpans: params.resourceSpans });
  }

  async exportMetrics(params: { resourceMetrics: unknown[] }) {
    await this.request<unknown>('POST', '/v1/metrics', { resourceMetrics: params.resourceMetrics });
  }
}

export class RedisConnector extends BaseConnector implements CacheConnector {
  constructor(baseUrl: string) {
    super('redis', baseUrl);
  }

  async get(key: string) {
    const res = await fetch(`${this.baseUrl}/get/${key}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json() as { result: string };
    return data.result;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    const path = ttlSeconds ? `/set/${key}/${encodeURIComponent(value)}?EX=${ttlSeconds}` : `/set/${key}/${encodeURIComponent(value)}`;
    await fetch(`${this.baseUrl}${path}`, { signal: AbortSignal.timeout(5000) });
  }

  async del(key: string) {
    await fetch(`${this.baseUrl}/del/${key}`, { signal: AbortSignal.timeout(5000) });
  }
}

export class NATSConnector extends BaseConnector implements EventBusConnector {
  constructor(baseUrl: string) {
    super('nats', baseUrl);
  }

  async publish(subject: string, data: unknown) {
    await this.request<unknown>('POST', `/publish/${subject}`, data);
  }

  async subscribe(subject: string, handler: (data: unknown) => void) {
    const eventSource = new EventSource(`${this.baseUrl}/subscribe/${subject}`);
    eventSource.onmessage = (event) => handler(JSON.parse(event.data));
  }
}

export class MinIOConnector extends BaseConnector implements StorageConnector {
  constructor(baseUrl: string) {
    super('minio', baseUrl);
  }

  async putObject(params: { bucket: string; key: string; body: Buffer; contentType: string }) {
    const res = await fetch(`${this.baseUrl}/${params.bucket}/${params.key}`, {
      method: 'PUT',
      headers: { 'Content-Type': params.contentType },
      body: params.body,
      signal: AbortSignal.timeout(30000),
    });
    return res.headers.get('location') ?? `${this.baseUrl}/${params.bucket}/${params.key}`;
  }

  async getObject(params: { bucket: string; key: string }) {
    const res = await fetch(`${this.baseUrl}/${params.bucket}/${params.key}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  async listObjects(params: { bucket: string; prefix?: string }) {
    const query = params.prefix ? `?prefix=${params.prefix}` : '';
    const res = await fetch(`${this.baseUrl}/${params.bucket}${query}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const text = await res.text();
    return text.split('\n').filter(Boolean);
  }
}

export class PrometheusConnector extends BaseConnector implements MetricsConnector {
  constructor(baseUrl: string) {
    super('prometheus', baseUrl);
  }

  async query(params: { promql: string; start: string; end: string; step: string }) {
    return this.request<unknown>('GET', `/api/v1/query_range?query=${encodeURIComponent(params.promql)}&start=${params.start}&end=${params.end}&step=${params.step}`);
  }

  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/-/healthy`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export class OpenMeterConnector extends BaseConnector implements UsageMeterConnector {
  constructor(baseUrl: string) {
    super('openmeter', baseUrl);
  }

  async reportUsage(params: { subject: string; event: string; quantity: number; timestamp: string }) {
    await this.request<unknown>('POST', '/api/v1/meters/ingest', [{
      subject: params.subject,
      event: params.event,
      quantity: params.quantity,
      timestamp: params.timestamp,
    }]);
  }
}

export class QdrantConnector extends BaseConnector implements VectorDBConnector {
  constructor(baseUrl: string) {
    super('qdrant', baseUrl);
  }

  async upsert(params: { collection: string; vectors: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> }) {
    await this.request<unknown>('PUT', `/collections/${params.collection}/points`, { points: params.vectors });
  }

  async search(params: { collection: string; vector: number[]; limit: number; filter?: Record<string, unknown> }) {
    const result = await this.request<{ result: Array<{ id: string; score: number; payload: Record<string, unknown> }> }>('POST', `/collections/${params.collection}/points/search`, {
      vector: params.vector,
      limit: params.limit,
      filter: params.filter,
    });
    return result.result;
  }
}
