import type { ChatMessage } from '@acg/shared';

export interface ACGConfig {
  gatewayUrl: string;
  adminUrl: string;
  apiKey: string;
  organizationId?: string;
  projectId?: string;
  timeout?: number;
  retries?: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  compliancePack?: string;
  firewallEnabled?: boolean;
  piiDetectionEnabled?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  requestId: string;
  model: string;
  provider: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finishReason: string;
  }>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  cost: { inputCost: number; outputCost: number; totalCost: number; currency: string };
  policyDecisions: unknown[];
  latencyMs: number;
}

export interface ModerationRequest {
  text?: string;
  messages?: Array<{ role: string; content: string }>;
  contentTypes?: string[];
}

export interface ModerationResponse {
  id: string;
  moderationResult: string;
  reasons: string[];
  riskLevel: string;
  latencyMs: number;
}

export class ACGClient {
  private config: Required<ACGConfig>;

  constructor(config: ACGConfig) {
    this.config = {
      gatewayUrl: config.gatewayUrl,
      adminUrl: config.adminUrl,
      apiKey: config.apiKey,
      organizationId: config.organizationId ?? 'default',
      projectId: config.projectId ?? 'default',
      timeout: config.timeout ?? 60000,
      retries: config.retries ?? 3,
    };
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const res = await this.request<ChatCompletionResponse>('POST', `${this.config.gatewayUrl}/v1/chat/completions`, {
      ...request,
      organizationId: this.config.organizationId,
      projectId: this.config.projectId,
    });
    return res;
  }

  async moderate(request: ModerationRequest): Promise<ModerationResponse> {
    return this.request<ModerationResponse>('POST', `${this.config.gatewayUrl}/v1/moderations`, {
      ...request,
      organizationId: this.config.organizationId,
    });
  }

  async createOrganization(params: { name: string; slug: string; compliancePack?: string }) {
    return this.request<unknown>('POST', `${this.config.adminUrl}/v1/organizations`, params);
  }

  async listPolicies(organizationId?: string) {
    const query = organizationId ? `?organizationId=${organizationId}` : '';
    return this.request<{ policies: unknown[]; total: number }>('GET', `${this.config.adminUrl}/v1/policies${query}`);
  }

  async createPolicy(params: { organizationId: string; name: string; type: string; rules: unknown[] }) {
    return this.request<unknown>('POST', `${this.config.adminUrl}/v1/policies`, params);
  }

  async healthCheck() {
    try {
      const res = await fetch(`${this.config.gatewayUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`ACG API Error (${res.status}): ${error.message ?? error.error?.message ?? 'Request failed'}`);
    }

    return res.json() as Promise<T>;
  }
}
